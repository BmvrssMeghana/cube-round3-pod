"""Password authentication and short-lived signed bearer tokens."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import dotenv_values

from . import db

PASSWORD_ITERATIONS = 310_000
TOKEN_LIFETIME_SECONDS = 8 * 60 * 60
_DUMMY_SALT = b"cube-invalid-user-salt"
DEMO_ACCOUNTS = {
    "org_alpha": ("org_alpha@cube.local", "org_demo_alpha", "Team Alpha"),
    "org_bravo": ("org_bravo@cube.local", "org_demo_bravo", "Team Bravo"),
}


class AuthError(ValueError):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def _token_secret() -> bytes:
    secret = os.environ.get("AUTH_TOKEN_SECRET", "")
    if not secret.strip():
        local_config = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
        secret = local_config.get("AUTH_TOKEN_SECRET") or ""
    if len(secret.encode("utf-8")) < 32:
        raise AuthError(503, "Authentication is not configured: set AUTH_TOKEN_SECRET to at least 32 characters.")
    return secret.encode("utf-8")


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _derive_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)


def _new_token(email: str, org_id: str) -> str:
    now = int(time.time())
    header = _b64encode(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64encode(json.dumps({
        "sub": email,
        "org_id": org_id,
        "iat": now,
        "exp": now + TOKEN_LIFETIME_SECONDS,
    }, separators=(",", ":")).encode("utf-8"))
    unsigned = f"{header}.{payload}"
    signature = hmac.new(_token_secret(), unsigned.encode("ascii"), hashlib.sha256).digest()
    return f"{unsigned}.{_b64encode(signature)}"


def decode_token(token: str) -> dict | None:
    secret = _token_secret()
    try:
        header_part, payload_part, signature_part = token.split(".")
        unsigned = f"{header_part}.{payload_part}"
        signature = _b64decode(signature_part)
        expected = hmac.new(secret, unsigned.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            return None
        header = json.loads(_b64decode(header_part))
        claims = json.loads(_b64decode(payload_part))
        if header != {"alg": "HS256", "typ": "JWT"}:
            return None
        if not isinstance(claims.get("sub"), str) or not isinstance(claims.get("org_id"), str):
            return None
        if not isinstance(claims.get("exp"), int) or claims["exp"] <= int(time.time()):
            return None
        return claims
    except (ValueError, TypeError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def _session(email: str, org_id: str, org_name: str) -> dict:
    return {
        "access_token": _new_token(email, org_id),
        "token_type": "bearer",
        "expires_in": TOKEN_LIFETIME_SECONDS,
        "user": {"email": email, "org_id": org_id, "org_name": org_name},
    }


def _validate_email(value: object) -> str:
    email = value.strip().lower() if isinstance(value, str) else ""
    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise AuthError(422, "Enter a valid email address.")
    return email


def _login_email(value: object) -> str:
    username = value.strip().lower() if isinstance(value, str) else ""
    if username in DEMO_ACCOUNTS:
        return DEMO_ACCOUNTS[username][0]
    return _validate_email(username)


def _validate_password(value: object) -> str:
    if not isinstance(value, str) or len(value) < 12 or len(value) > 256:
        raise AuthError(422, "Password must be between 12 and 256 characters.")
    return value


def _org_name(org_id: str) -> str:
    conn = db.get_connection()
    is_pg = db.is_postgres_connection(conn)
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name FROM organizations WHERE org_id = %s"
                if is_pg else "SELECT name FROM organizations WHERE org_id = ?",
                (org_id,),
            )
            row = cursor.fetchone()
        return row[0] if row else org_id
    finally:
        conn.close()


def register_user(body: dict) -> dict:
    _token_secret()
    email = _validate_email(body.get("email"))
    password = _validate_password(body.get("password"))
    mode = body.get("mode")

    if mode == "team":
        team = body.get("team")
        team_options = {
            "alpha": ("org_demo_alpha", "Team Alpha", "CUBE_ALPHA_INVITE_CODE"),
            "bravo": ("org_demo_bravo", "Team Bravo", "CUBE_BRAVO_INVITE_CODE"),
        }
        if team not in team_options:
            raise AuthError(422, "Choose Team Alpha, Team Bravo, or create a new organization.")
        org_id, org_name, invite_setting = team_options[team]
        expected_invite = os.environ.get(invite_setting, "")
        invite = body.get("invite_code")
        if not expected_invite:
            raise AuthError(503, f"Registration for {org_name} is disabled until {invite_setting} is configured.")
        if not isinstance(invite, str) or not hmac.compare_digest(invite, expected_invite):
            raise AuthError(403, "The team invite code is invalid.")
    elif mode == "organization":
        org_name = body.get("org_name")
        if not isinstance(org_name, str) or not org_name.strip() or len(org_name.strip()) > 80:
            raise AuthError(422, "Organization name must be between 1 and 80 characters.")
        org_name = org_name.strip()
        slug = re.sub(r"[^a-z0-9]+", "_", org_name.lower()).strip("_")[:32] or "workspace"
        org_id = f"org_{slug}_{secrets.token_hex(4)}"
    else:
        raise AuthError(422, "Choose a team or create a new organization.")

    salt = secrets.token_bytes(16)
    password_hash = _derive_password(password, salt)
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    conn = db.get_connection()
    is_pg = db.is_postgres_connection(conn)
    try:
        with conn:
            cursor = conn.cursor()
            if mode == "organization":
                cursor.execute(
                    "INSERT INTO organizations (org_id, name, created_at) VALUES (%s, %s, %s)"
                    if is_pg else "INSERT INTO organizations (org_id, name, created_at) VALUES (?, ?, ?)",
                    (org_id, org_name, now),
                )
            cursor.execute(
                """INSERT INTO users (user_id, email, org_id, password_salt, password_hash, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s)"""
                if is_pg else
                """INSERT INTO users (user_id, email, org_id, password_salt, password_hash, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (user_id, email, org_id, salt.hex(), password_hash.hex(), now),
            )
    except (sqlite3.IntegrityError, psycopg2.IntegrityError) as exc:
        raise AuthError(409, "An account with this email already exists.") from exc
    finally:
        conn.close()

    return _session(email, org_id, org_name)


def login_user(body: dict) -> dict:
    _token_secret()
    email = _login_email(body.get("email"))
    password = body.get("password")
    if not isinstance(password, str) or len(password) > 256:
        raise AuthError(401, "Email or password is incorrect.")

    conn = db.get_connection()
    is_pg = db.is_postgres_connection(conn)
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT u.org_id, u.password_salt, u.password_hash, o.name
                   FROM users u JOIN organizations o ON o.org_id = u.org_id
                   WHERE u.email = %s"""
                if is_pg else
                """SELECT u.org_id, u.password_salt, u.password_hash, o.name
                   FROM users u JOIN organizations o ON o.org_id = u.org_id
                   WHERE u.email = ?""",
                (email,),
            )
            row = cursor.fetchone()
    finally:
        conn.close()

    if row is None:
        _derive_password(password, _DUMMY_SALT)
        raise AuthError(401, "Email or password is incorrect.")
    org_id, salt, stored_hash, org_name = row
    actual_hash = _derive_password(password, bytes.fromhex(salt))
    if not hmac.compare_digest(actual_hash, bytes.fromhex(stored_hash)):
        raise AuthError(401, "Email or password is incorrect.")
    return _session(email, org_id, org_name)


def seed_demo_accounts() -> None:
    """Create temporary local/demo logins once; existing passwords are never reset."""
    now = datetime.now(timezone.utc).isoformat()
    conn = db.get_connection()
    is_pg = db.is_postgres_connection(conn)
    try:
        with conn:
            cursor = conn.cursor()
            for username, (email, org_id, org_name) in DEMO_ACCOUNTS.items():
                cursor.execute(
                    "INSERT INTO organizations (org_id, name, created_at) VALUES (%s, %s, %s) ON CONFLICT (org_id) DO NOTHING"
                    if is_pg else
                    "INSERT OR IGNORE INTO organizations (org_id, name, created_at) VALUES (?, ?, ?)",
                    (org_id, org_name, now),
                )
                cursor.execute(
                    "SELECT 1 FROM users WHERE email = %s" if is_pg else "SELECT 1 FROM users WHERE email = ?",
                    (email,),
                )
                if cursor.fetchone() is not None:
                    continue
                salt = secrets.token_bytes(16)
                password_hash = _derive_password("root", salt)
                cursor.execute(
                    """INSERT INTO users (user_id, email, org_id, password_salt, password_hash, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s)"""
                    if is_pg else
                    """INSERT INTO users (user_id, email, org_id, password_salt, password_hash, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), email, org_id, salt.hex(), password_hash.hex(), now),
                )
    finally:
        conn.close()


def get_user(email: str, org_id: str) -> dict | None:
    conn = db.get_connection()
    is_pg = db.is_postgres_connection(conn)
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT u.email, u.org_id, o.name
                   FROM users u JOIN organizations o ON o.org_id = u.org_id
                   WHERE u.email = %s AND u.org_id = %s"""
                if is_pg else
                """SELECT u.email, u.org_id, o.name
                   FROM users u JOIN organizations o ON o.org_id = u.org_id
                   WHERE u.email = ? AND u.org_id = ?""",
                (email, org_id),
            )
            row = cursor.fetchone()
        if row is None:
            return None
        return {"email": row[0], "org_id": row[1], "org_name": row[2]}
    finally:
        conn.close()
