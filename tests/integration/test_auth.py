import pytest
from fastapi.testclient import TestClient

from orchestration import api
from orchestration import auth as auth_service
from orchestration import db


@pytest.fixture
def auth_client(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATABASE_URL", "")
    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "auth-test.db"))
    monkeypatch.setenv("AUTH_TOKEN_SECRET", "test-only-signing-secret-with-more-than-32-characters")
    monkeypatch.setenv("CUBE_ALPHA_INVITE_CODE", "alpha-invite")
    monkeypatch.setenv("CUBE_BRAVO_INVITE_CODE", "bravo-invite")
    db.init_db()
    auth_service.seed_demo_accounts()
    with TestClient(api.app) as client:
        yield client


def test_auth_registration_login_and_organization_scoping(auth_client):
    registration = auth_client.post("/auth/register", json={
        "email": "alpha@example.com",
        "password": "a sufficiently long password",
        "mode": "team",
        "team": "alpha",
        "invite_code": "alpha-invite",
    })
    assert registration.status_code == 200
    session = registration.json()
    assert session["user"]["org_id"] == "org_demo_alpha"

    headers = {"Authorization": f"Bearer {session['access_token']}"}
    assert auth_client.get("/auth/me", headers=headers).json() == session["user"]
    assert auth_client.get("/workflows", headers=headers).status_code == 200
    assert auth_client.get("/workflows?org_id=org_demo_bravo", headers=headers).status_code == 403
    assert auth_client.get("/workflows").status_code == 401

    login = auth_client.post("/auth/login", json={
        "email": "ALPHA@example.com",
        "password": "a sufficiently long password",
    })
    assert login.status_code == 200
    assert login.json()["user"] == session["user"]


def test_registration_requires_a_valid_team_invite_code(auth_client):
    response = auth_client.post("/auth/register", json={
        "email": "bravo@example.com",
        "password": "a sufficiently long password",
        "mode": "team",
        "team": "bravo",
        "invite_code": "wrong",
    })
    assert response.status_code == 403


def test_signing_secret_uses_root_env_when_process_variable_is_blank(monkeypatch):
    monkeypatch.setenv("AUTH_TOKEN_SECRET", "")
    monkeypatch.setattr(
        auth_service,
        "dotenv_values",
        lambda _: {"AUTH_TOKEN_SECRET": "local-test-signing-key-with-32-plus-chars"},
    )
    assert len(auth_service._token_secret()) >= 32


def test_registration_creates_an_isolated_organization(auth_client):
    response = auth_client.post("/auth/register", json={
        "email": "owner@example.com",
        "password": "a sufficiently long password",
        "mode": "organization",
        "org_name": "New Workspace",
    })
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["org_name"] == "New Workspace"
    assert user["org_id"].startswith("org_new_workspace_")


@pytest.mark.parametrize(
    ("username", "org_id"),
    [("org_alpha", "org_demo_alpha"), ("org_bravo", "org_demo_bravo")],
)
def test_temporary_demo_credentials_sign_in_to_their_own_organization(auth_client, username, org_id):
    response = auth_client.post("/auth/login", json={"email": username, "password": "root"})
    assert response.status_code == 200
    assert response.json()["user"]["org_id"] == org_id
