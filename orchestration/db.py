"""
CUBE Round 3 - Centralized Production Database Layer
Supports PostgreSQL (via psycopg2) and SQLite (local fallback).
Maintains workflows, units, captures, evidence records, checks, charges, claims, and human review audit logs.
"""

import os
import json
import sqlite3
import psycopg2
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or ""
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cube_unified.db")

def get_connection():
    if DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://"):
        return psycopg2.connect(DATABASE_URL)
    else:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


def is_postgres_connection(conn) -> bool:
    return isinstance(conn, psycopg2.extensions.connection)

def init_db():
    conn = get_connection()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    
    id_pk = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
    text_type = "TEXT"
    json_type = "JSONB" if is_postgres else "TEXT"
    timestamp_type = "TIMESTAMPTZ" if is_postgres else "TEXT"

    with conn:
        cursor = conn.cursor()
        
        # Workflows table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS workflows (
            workflow_id {text_type} PRIMARY KEY,
            subject_id {text_type} NOT NULL,
            route {text_type} NOT NULL,
            current_stage {text_type} NOT NULL,
            status {text_type} NOT NULL,
            final_outcome {text_type},
            workflow_data {json_type},
            org_id {text_type} DEFAULT 'org_demo_alpha',
            created_at {timestamp_type},
            updated_at {timestamp_type}
        )
        """)

        # Units table (org-scoped; attributes holds stage-specific fields as JSON)
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS units (
            unit_id {text_type} NOT NULL,
            org_id {text_type} NOT NULL DEFAULT 'org_demo_alpha',
            sku {text_type} NOT NULL,
            expected_quantity INTEGER DEFAULT 1,
            variant {text_type},
            fnsku {text_type},
            order_id {text_type},
            customer_id {text_type},
            channel {text_type} DEFAULT 'fba',
            is_returned BOOLEAN DEFAULT FALSE,
            attributes {json_type},
            created_at {timestamp_type},
            PRIMARY KEY (org_id, unit_id)
        )
        """)

        # Auto-migration check for SQLite database files
        if not is_postgres:
            cursor.execute("PRAGMA table_info(units)")
            cols = {col[1] for col in cursor.fetchall()}
            if cols:
                expected_units_cols = {
                    "org_id": "TEXT DEFAULT 'org_demo_alpha'",
                    "sku": "TEXT DEFAULT ''",
                    "expected_quantity": "INTEGER DEFAULT 1",
                    "variant": "TEXT",
                    "fnsku": "TEXT",
                    "order_id": "TEXT",
                    "customer_id": "TEXT",
                    "channel": "TEXT DEFAULT 'fba'",
                    "is_returned": "BOOLEAN DEFAULT 0",
                    "attributes": "TEXT",
                    "created_at": "TEXT",
                }
                for col_name, col_def in expected_units_cols.items():
                    if col_name not in cols:
                        try:
                            cursor.execute(f"ALTER TABLE units ADD COLUMN {col_name} {col_def}")
                        except Exception:
                            pass

            cursor.execute("PRAGMA table_info(workflows)")
            wf_cols = {col[1] for col in cursor.fetchall()}
            if wf_cols:
                expected_wf_cols = {
                    "org_id": "TEXT DEFAULT 'org_demo_alpha'",
                    "subject_id": "TEXT DEFAULT ''",
                    "route": "TEXT DEFAULT 'fba'",
                    "current_stage": "TEXT DEFAULT 'receiving'",
                    "status": "TEXT DEFAULT 'PENDING'",
                    "final_outcome": "TEXT",
                    "created_at": "TEXT",
                    "updated_at": "TEXT",
                }
                for col_name, col_def in expected_wf_cols.items():
                    if col_name not in wf_cols:
                        try:
                            cursor.execute(f"ALTER TABLE workflows ADD COLUMN {col_name} {col_def}")
                        except Exception:
                            pass

        # Captures / Images table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS captures (
            capture_id {text_type} PRIMARY KEY,
            unit_id {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            image_path {text_type},
            image_base64 {text_type},
            created_at {timestamp_type}
        )
        """)

        # Evidence Records table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS evidence_records (
            evidence_id {text_type} PRIMARY KEY,
            workflow_id {text_type} NOT NULL,
            unit_id {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            verdict {text_type} NOT NULL,
            confidence REAL NOT NULL,
            reason {text_type},
            model_name {text_type},
            model_version {text_type},
            vision_mode {text_type} DEFAULT 'AI Vision',
            metadata_json {json_type},
            evidence_data {json_type},
            created_at {timestamp_type}
        )
        """)

        # Evidence Checks table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS evidence_checks (
            check_id {id_pk},
            evidence_id {text_type} NOT NULL,
            check_name {text_type} NOT NULL,
            status {text_type} NOT NULL,
            score REAL,
            confidence REAL,
            detail {text_type},
            created_at {timestamp_type}
        )
        """)

        # Upstream Evidence table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS upstream_evidence (
            id {id_pk},
            evidence_id {text_type} NOT NULL,
            upstream_evidence_id {text_type} NOT NULL
        )
        """)

        # Financial Charges table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS charges (
            charge_id {text_type} PRIMARY KEY,
            unit_id {text_type} NOT NULL,
            amount REAL NOT NULL,
            reason {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            created_at {timestamp_type}
        )
        """)

        # Recovery Claims table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS recovery_claims (
            claim_id {text_type} PRIMARY KEY,
            unit_id {text_type} NOT NULL,
            charge_id {text_type} NOT NULL,
            position {text_type} NOT NULL,
            claim_recommended {text_type} NOT NULL,
            claim_amount REAL NOT NULL,
            reasoning {text_type},
            dispute_letter {text_type},
            created_at {timestamp_type}
        )
        """)

        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS organizations (
            org_id {text_type} PRIMARY KEY,
            name {text_type} NOT NULL,
            created_at {timestamp_type}
        )
        """)
        cursor.execute(
            "INSERT INTO organizations (org_id, name, created_at) VALUES (%s, %s, %s) ON CONFLICT (org_id) DO NOTHING"
            if is_postgres
            else "INSERT OR IGNORE INTO organizations (org_id, name, created_at) VALUES (?, ?, ?)",
            ("org_demo_alpha", "Team Alpha", datetime.now(timezone.utc).isoformat()),
        )
        cursor.execute(
            "INSERT INTO organizations (org_id, name, created_at) VALUES (%s, %s, %s) ON CONFLICT (org_id) DO NOTHING"
            if is_postgres
            else "INSERT OR IGNORE INTO organizations (org_id, name, created_at) VALUES (?, ?, ?)",
            ("org_demo_bravo", "Team Bravo", datetime.now(timezone.utc).isoformat()),
        )
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS users (
            user_id {text_type} PRIMARY KEY,
            email {text_type} NOT NULL UNIQUE,
            org_id {text_type} NOT NULL,
            password_salt {text_type} NOT NULL,
            password_hash {text_type} NOT NULL,
            created_at {timestamp_type} NOT NULL
        )
        """)

        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS source_records (
            org_id {text_type} NOT NULL,
            record_type {text_type} NOT NULL,
            record_id {text_type} NOT NULL,
            unit_id {text_type} NOT NULL,
            source_file {text_type} NOT NULL,
            record_data {json_type} NOT NULL,
            captured_at {timestamp_type},
            imported_at {timestamp_type} NOT NULL,
            PRIMARY KEY (org_id, record_type, record_id)
        )
        """)

        # Human Reviews & Audit Logs table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS human_reviews (
            review_id {text_type} PRIMARY KEY,
            exception_id {text_type},
            workflow_id {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            old_verdict {text_type} NOT NULL,
            new_verdict {text_type} NOT NULL,
            reason {text_type} NOT NULL,
            actor {text_type} DEFAULT 'human_reviewer',
            status {text_type} DEFAULT 'RESOLVED',
            timestamp {timestamp_type}
        )
        """)

        if is_postgres:
            # Existing PostgreSQL installations predate the tenant-scoped units schema.
            cursor.execute("ALTER TABLE units ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT 'org_demo_alpha'")
            cursor.execute("ALTER TABLE units ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'fba'")
            cursor.execute("ALTER TABLE units ADD COLUMN IF NOT EXISTS is_returned BOOLEAN NOT NULL DEFAULT FALSE")
            cursor.execute("ALTER TABLE units ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb")
            cursor.execute(
                """
                DO $$
                DECLARE
                    attributes_type TEXT;
                BEGIN
                    SELECT data_type INTO attributes_type
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'units'
                      AND column_name = 'attributes';

                    IF attributes_type IS DISTINCT FROM 'jsonb' THEN
                        ALTER TABLE units ALTER COLUMN attributes TYPE JSONB
                        USING CASE
                            WHEN attributes IS NULL OR btrim(attributes::text) = '' THEN '{}'::jsonb
                            ELSE attributes::text::jsonb
                        END;
                    END IF;
                END $$;
                """
            )
            cursor.execute("UPDATE units SET org_id = 'org_demo_alpha' WHERE org_id IS NULL OR org_id = ''")
            cursor.execute("UPDATE units SET channel = 'fba' WHERE channel IS NULL OR channel = ''")
            cursor.execute("UPDATE units SET is_returned = FALSE WHERE is_returned IS NULL")
            cursor.execute("UPDATE units SET attributes = '{}'::jsonb WHERE attributes IS NULL")
            cursor.execute("ALTER TABLE units ALTER COLUMN org_id SET DEFAULT 'org_demo_alpha'")
            cursor.execute("ALTER TABLE units ALTER COLUMN org_id SET NOT NULL")
            cursor.execute("ALTER TABLE units ALTER COLUMN channel SET DEFAULT 'fba'")
            cursor.execute("ALTER TABLE units ALTER COLUMN channel SET NOT NULL")
            cursor.execute("ALTER TABLE units ALTER COLUMN is_returned SET DEFAULT FALSE")
            cursor.execute("ALTER TABLE units ALTER COLUMN is_returned SET NOT NULL")
            cursor.execute("ALTER TABLE units ALTER COLUMN attributes SET DEFAULT '{}'::jsonb")
            cursor.execute("ALTER TABLE units ALTER COLUMN attributes SET NOT NULL")
            cursor.execute(
                """
                DO $$
                DECLARE
                    primary_key_name TEXT;
                    primary_key_definition TEXT;
                BEGIN
                    SELECT conname, pg_get_constraintdef(oid)
                    INTO primary_key_name, primary_key_definition
                    FROM pg_constraint
                    WHERE conrelid = 'units'::regclass AND contype = 'p';

                    IF primary_key_definition IS DISTINCT FROM 'PRIMARY KEY (org_id, unit_id)' THEN
                        IF primary_key_name IS NOT NULL THEN
                            EXECUTE format('ALTER TABLE units DROP CONSTRAINT %I', primary_key_name);
                        END IF;
                        ALTER TABLE units ADD CONSTRAINT units_pkey PRIMARY KEY (org_id, unit_id);
                    END IF;
                END $$;
                """
            )
            cursor.execute("ALTER TABLE workflows ADD COLUMN IF NOT EXISTS workflow_data JSONB")
            cursor.execute("ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS evidence_data JSONB")
        else:
            for table, column, definition in (
                ("workflows", "workflow_data", "TEXT"),
                ("evidence_records", "evidence_data", "TEXT"),
            ):
                cursor.execute(f"PRAGMA table_info({table})")
                existing_columns = {row[1] for row in cursor.fetchall()}
                if column not in existing_columns:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    conn.close()

# Helper Functions for DB Queries & Updates

def save_unit_db(
    unit_id: str,
    sku: str,
    expected_quantity: int = 1,
    variant: Optional[str] = None,
    fnsku: Optional[str] = None,
    order_id: Optional[str] = None,
    org_id: str = "org_demo_alpha",
    channel: str = "fba",
    is_returned: bool = False,
    attributes: Optional[Dict[str, Any]] = None,
    created_at: Optional[str] = None,
):
    conn = get_connection()
    now = created_at or datetime.now(timezone.utc).isoformat()
    attrs_json = json.dumps(attributes or {})
    is_pg = isinstance(conn, psycopg2.extensions.connection)
    with conn:
        cursor = conn.cursor()
        if is_pg:
            cursor.execute(
                """
                INSERT INTO units (unit_id, org_id, sku, expected_quantity, variant, fnsku, order_id, channel, is_returned, attributes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (org_id, unit_id) DO UPDATE SET
                  sku=EXCLUDED.sku, expected_quantity=EXCLUDED.expected_quantity, variant=EXCLUDED.variant,
                  fnsku=EXCLUDED.fnsku, order_id=EXCLUDED.order_id, channel=EXCLUDED.channel,
                  is_returned=EXCLUDED.is_returned, attributes=EXCLUDED.attributes
                """,
                (unit_id, org_id, sku, expected_quantity, variant, fnsku, order_id, channel, is_returned, attrs_json, now),
            )
        else:
            cursor.execute(
                """
                INSERT OR REPLACE INTO units (unit_id, org_id, sku, expected_quantity, variant, fnsku, order_id, channel, is_returned, attributes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (unit_id, org_id, sku, expected_quantity, variant, fnsku, order_id, channel, int(is_returned), attrs_json, now),
            )
    conn.close()


def get_unit_profile(org_id: str, unit_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    is_pg = isinstance(conn, psycopg2.extensions.connection)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT unit_id, org_id, sku, expected_quantity, variant, fnsku, order_id, channel, is_returned, attributes FROM units WHERE org_id = %s AND unit_id = %s"
            if is_pg
            else "SELECT unit_id, org_id, sku, expected_quantity, variant, fnsku, order_id, channel, is_returned, attributes FROM units WHERE org_id = ? AND unit_id = ?",
            (org_id, unit_id),
        )
        row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    if is_pg:
        keys = ["unit_id", "org_id", "sku", "expected_quantity", "variant", "fnsku", "order_id", "channel", "is_returned", "attributes"]
        rec = dict(zip(keys, row))
    else:
        rec = dict(row) if hasattr(row, "keys") else {
            "unit_id": row[0], "org_id": row[1], "sku": row[2], "expected_quantity": row[3],
            "variant": row[4], "fnsku": row[5], "order_id": row[6], "channel": row[7],
            "is_returned": bool(row[8]), "attributes": row[9],
        }
    attrs = rec.get("attributes")
    if isinstance(attrs, str):
        try:
            rec["attributes"] = json.loads(attrs)
        except Exception:
            rec["attributes"] = {}
    return rec


def ensure_organization(org_id: str, name: str) -> None:
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    is_pg = isinstance(conn, psycopg2.extensions.connection)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO organizations (org_id, name, created_at) VALUES (%s, %s, %s) ON CONFLICT (org_id) DO NOTHING"
            if is_pg
            else "INSERT OR IGNORE INTO organizations (org_id, name, created_at) VALUES (?, ?, ?)",
            (org_id, name, now),
        )
    conn.close()

def save_workflow_db(
    workflow_id: str,
    subject_id: str,
    route: str = "FBA",
    current_stage: str = "receiving",
    status: str = "ACTIVE",
    final_outcome: Optional[str] = None,
    org_id: str = "org_demo_alpha",
    workflow_data: Optional[Dict[str, Any]] = None,
):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    workflow_json = json.dumps(workflow_data) if workflow_data is not None else None
    created_at = (workflow_data or {}).get("timestamps", {}).get("created_at", now)
    updated_at = (workflow_data or {}).get("timestamps", {}).get("updated_at", now)
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    with conn:
        cursor = conn.cursor()
        if is_postgres:
            cursor.execute(
                """
                INSERT INTO workflows (
                    workflow_id, subject_id, route, current_stage, status, final_outcome,
                    workflow_data, org_id, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                ON CONFLICT(workflow_id) DO UPDATE SET
                    subject_id=EXCLUDED.subject_id, route=EXCLUDED.route,
                    current_stage=EXCLUDED.current_stage, status=EXCLUDED.status,
                    final_outcome=EXCLUDED.final_outcome,
                    workflow_data=COALESCE(EXCLUDED.workflow_data, workflows.workflow_data),
                    created_at=CASE WHEN workflows.workflow_data IS NULL THEN EXCLUDED.created_at ELSE workflows.created_at END,
                    updated_at=EXCLUDED.updated_at
                """,
                (workflow_id, subject_id, route, current_stage, status, final_outcome, workflow_json, org_id, created_at, updated_at),
            )
        else:
            cursor.execute(
                """
                INSERT INTO workflows (
                    workflow_id, subject_id, route, current_stage, status, final_outcome,
                    workflow_data, org_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(workflow_id) DO UPDATE SET
                    subject_id=excluded.subject_id, route=excluded.route,
                    current_stage=excluded.current_stage, status=excluded.status,
                    final_outcome=excluded.final_outcome,
                    workflow_data=COALESCE(excluded.workflow_data, workflows.workflow_data),
                    created_at=CASE WHEN workflows.workflow_data IS NULL THEN excluded.created_at ELSE workflows.created_at END,
                    updated_at=excluded.updated_at
                """,
                (workflow_id, subject_id, route, current_stage, status, final_outcome, workflow_json, org_id, created_at, updated_at),
            )
    conn.close()

def save_capture_db(capture_id: str, unit_id: str, stage: str, image_path: Optional[str] = None, image_base64: Optional[str] = None):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO captures (capture_id, unit_id, stage, image_path, image_base64, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT(capture_id) DO NOTHING
        """ if isinstance(conn, psycopg2.extensions.connection) else """
        INSERT OR IGNORE INTO captures (capture_id, unit_id, stage, image_path, image_base64, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (capture_id, unit_id, stage, image_path, image_base64, now))
    conn.close()

def save_evidence_db(record: Dict[str, Any]):
    conn = get_connection()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    now = datetime.now(timezone.utc).isoformat()
    
    evidence_id = record.get("evidence_id") or record.get("record_id")
    if not evidence_id:
        raise ValueError("evidence record missing record_id")
    workflow_id = record["workflow_id"]
    subj = record.get("subject") or {}
    unit_id = subj.get("subject_id") or subj.get("unit_id") or record.get("subject_id")
    stage = record["stage"]
    decision = record.get("decision") or {}
    verdict = decision.get("verdict") or record.get("verdict", "UNCERTAIN")
    confidence = float(decision.get("confidence") if decision.get("confidence") is not None else record.get("confidence", 1.0))
    reason = decision.get("reason") or record.get("reason", "")
    model_info = record.get("model", {})
    model_name = model_info.get("name", "CUBE-Vision-Core") if isinstance(model_info, dict) else str(model_info)
    model_version = model_info.get("version", "v3.0.0") if isinstance(model_info, dict) else "v3.0.0"
    vision_mode = record.get("vision_mode", "AI Vision")
    metadata_json = json.dumps(record.get("payload", {}))
    evidence_json = json.dumps(record)

    with conn:
        cursor = conn.cursor()
        # Insert evidence record
        cursor.execute("""
        INSERT INTO evidence_records (evidence_id, workflow_id, unit_id, stage, verdict, confidence, reason, model_name, model_version, vision_mode, metadata_json, evidence_data, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
        ON CONFLICT(evidence_id) DO UPDATE SET verdict=EXCLUDED.verdict, confidence=EXCLUDED.confidence,
            reason=EXCLUDED.reason, evidence_data=EXCLUDED.evidence_data
        """ if is_postgres else """
        INSERT INTO evidence_records (evidence_id, workflow_id, unit_id, stage, verdict, confidence, reason, model_name, model_version, vision_mode, metadata_json, evidence_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(evidence_id) DO UPDATE SET verdict=excluded.verdict, confidence=excluded.confidence,
            reason=excluded.reason, evidence_data=excluded.evidence_data
        """, (evidence_id, workflow_id, unit_id, stage, verdict, confidence, reason, model_name, model_version, vision_mode, metadata_json, evidence_json, now))

        # Insert individual checks if present in payload
        payload = record.get("payload", {})
        checks = payload.get("checks", [])
        cursor.execute(
            "DELETE FROM evidence_checks WHERE evidence_id = %s" if is_postgres else "DELETE FROM evidence_checks WHERE evidence_id = ?",
            (evidence_id,),
        )
        for chk in checks:
            check_name = chk.get("check_name", chk.get("name", "check"))
            status = chk.get("status", "PASS")
            score = float(chk.get("score", 1.0))
            chk_conf = float(chk.get("confidence", confidence))
            detail = chk.get("reason", chk.get("detail", ""))
            cursor.execute("""
            INSERT INTO evidence_checks (evidence_id, check_name, status, score, confidence, detail, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """ if is_postgres else """
            INSERT INTO evidence_checks (evidence_id, check_name, status, score, confidence, detail, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (evidence_id, check_name, status, score, chk_conf, detail, now))

        # Insert upstream evidence references
        cursor.execute(
            "DELETE FROM upstream_evidence WHERE evidence_id = %s" if is_postgres else "DELETE FROM upstream_evidence WHERE evidence_id = ?",
            (evidence_id,),
        )
        upstream_ids = record.get("upstream_refs", record.get("upstream_evidence_ids", []))
        for up_id in upstream_ids:
            cursor.execute("""
            INSERT INTO upstream_evidence (evidence_id, upstream_evidence_id)
            VALUES (%s, %s)
            """ if is_postgres else """
            INSERT INTO upstream_evidence (evidence_id, upstream_evidence_id)
            VALUES (?, ?)
            """, (evidence_id, up_id))

    conn.close()

def save_human_review_db(review_id: str, exception_id: str, workflow_id: str, stage: str, old_verdict: str, new_verdict: str, reason: str, actor: str = "human_reviewer"):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO human_reviews (review_id, exception_id, workflow_id, stage, old_verdict, new_verdict, reason, actor, status, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'RESOLVED', %s)
        ON CONFLICT(review_id) DO UPDATE SET new_verdict=EXCLUDED.new_verdict, reason=EXCLUDED.reason, timestamp=EXCLUDED.timestamp
        """ if isinstance(conn, psycopg2.extensions.connection) else """
        INSERT OR REPLACE INTO human_reviews (review_id, exception_id, workflow_id, stage, old_verdict, new_verdict, reason, actor, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RESOLVED', ?)
        """, (review_id, exception_id, workflow_id, stage, old_verdict, new_verdict, reason, actor, now))
    conn.close()

def get_evidence_for_unit(unit_id: str, org_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    records = []
    is_pg = isinstance(conn, psycopg2.extensions.connection)
    placeholder = "%s" if is_pg else "?"
    with conn:
        cursor = conn.cursor()
        if org_id is None:
            cursor.execute(
                f"SELECT * FROM evidence_records WHERE unit_id = {placeholder} ORDER BY created_at ASC",
                (unit_id,),
            )
        else:
            cursor.execute(
                f"""SELECT e.* FROM evidence_records e
                    JOIN workflows w ON w.workflow_id = e.workflow_id
                    WHERE e.unit_id = {placeholder} AND w.org_id = {placeholder}
                    ORDER BY e.created_at ASC""",
                (unit_id, org_id),
            )
        rows = cursor.fetchall()
        for r in rows:
            rec = dict(r) if isinstance(r, sqlite3.Row) else {
                "evidence_id": r[0], "workflow_id": r[1], "unit_id": r[2], "stage": r[3],
                "verdict": r[4], "confidence": r[5], "reason": r[6], "model_name": r[7],
                "model_version": r[8], "vision_mode": r[9], "metadata_json": r[10], "created_at": r[11]
            }
            if isinstance(rec.get("metadata_json"), str):
                try:
                    rec["payload"] = json.loads(rec["metadata_json"])
                except Exception:
                    rec["payload"] = {}
            else:
                rec["payload"] = rec.get("metadata_json") or {}
            records.append(rec)
    conn.close()
    return records


def get_evidence_record(record_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    is_pg = isinstance(conn, psycopg2.extensions.connection)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT evidence_data FROM evidence_records WHERE evidence_id = %s"
            if is_pg
            else "SELECT evidence_data FROM evidence_records WHERE evidence_id = ?",
            (record_id,),
        )
        row = cursor.fetchone()
    conn.close()
    if not row or row[0] is None:
        return None
    return json.loads(row[0]) if isinstance(row[0], str) else row[0]


def get_source_records_for_unit(unit_id: str, org_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    is_pg = isinstance(conn, psycopg2.extensions.connection)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT record_type, record_id, source_file, record_data, captured_at
            FROM source_records
            WHERE org_id = %s AND unit_id = %s
            ORDER BY captured_at, record_type, record_id
            """ if is_pg else """
            SELECT record_type, record_id, source_file, record_data, captured_at
            FROM source_records
            WHERE org_id = ? AND unit_id = ?
            ORDER BY captured_at, record_type, record_id
            """,
            (org_id, unit_id),
        )
        rows = cursor.fetchall()
    conn.close()
    records = []
    for record_type, record_id, source_file, record_data, captured_at in rows:
        if isinstance(record_data, str):
            record_data = json.loads(record_data)
        records.append({
            "record_type": record_type,
            "record_id": record_id,
            "source_file": source_file,
            "record_data": record_data,
            "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else captured_at,
        })
    return records
