"""Unified FastAPI Server for CUBE Round 3 Orchestrator & Live Agent Inspection Endpoints."""

from __future__ import annotations

import os
import time
import logging
import base64
import binascii
import hashlib
import re
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from shared.utils.records import pending_output, utcnow
from orchestration.db import (
    init_db,
    get_connection,
    is_postgres_connection,
    save_workflow_db,
    save_unit_db,
    save_human_review_db,
    get_source_records_for_unit,
    get_unit_profile,
)
from orchestration import dashboard as dashboard_api
from . import auth as auth_service
from .clients import HttpClient, client_for, load_manifest
from .orchestrator import (
    apply_override,
    bundle,
    default_flow_path,
    flow_stages,
    load_flow,
    new_workflow,
    resume,
    run_workflow,
    workflow_id_for,
    _previous_evidence,
    _finalize,
    applies,
)
from .store import DatabaseStore, EvidenceConflict

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [OrchestratorAPI] %(message)s")
logger = logging.getLogger("orchestrator_api")

app = FastAPI(title="CUBE Round 3 Unified Commerce Operations API")
FLOW = os.environ.get("ORCH_FLOW") or default_flow_path()
STORE = DatabaseStore()
INPUT_ROOT = Path(os.environ.get("INPUT_DIR", Path(__file__).resolve().parents[1] / "data" / "input"))
STAGE_PREFIX = {"receiving": "RCV", "prep": "PRP", "pack": "PCK", "returns": "RTN", "recovery": "RCY"}
PUBLIC_PATHS = {"/health", "/auth/login", "/auth/register", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def require_authentication(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS or request.method == "OPTIONS":
        return await call_next(request)
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return JSONResponse({"detail": "Sign in to access organization data."}, status_code=401)
    try:
        claims = auth_service.decode_token(token)
    except auth_service.AuthError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)
    if claims is None:
        return JSONResponse({"detail": "Your session is invalid or expired. Sign in again."}, status_code=401)
    request.state.auth = claims
    return await call_next(request)


def _authorized_org(request: Request, requested_org: str | None = None) -> str:
    org_id = request.state.auth["org_id"]
    if requested_org is not None and requested_org != org_id:
        raise HTTPException(403, "This account cannot access another organization's records.")
    return org_id


@app.post("/auth/register")
def register(body: dict) -> dict:
    try:
        return auth_service.register_user(body)
    except auth_service.AuthError as exc:
        raise HTTPException(exc.status_code, str(exc)) from exc


@app.post("/auth/login")
def login(body: dict) -> dict:
    try:
        return auth_service.login_user(body)
    except auth_service.AuthError as exc:
        raise HTTPException(exc.status_code, str(exc)) from exc


@app.get("/auth/me")
def current_user(request: Request) -> dict:
    claims = request.state.auth
    user = auth_service.get_user(claims["sub"], claims["org_id"])
    if user is None:
        raise HTTPException(401, "This account is no longer active. Sign in again.")
    return user

# Initialize Centralized Database on startup
try:
    init_db()
    auth_service.seed_demo_accounts()
    logger.info("Centralized Production Database initialized successfully.")
except Exception as exc:
    logger.warning(f"Database initialization warning: {exc}")


@app.get("/health")
def health() -> dict:
    agents = {}
    for stage in flow_stages(load_flow(FLOW)):
        try:
            client = client_for(stage)
            if isinstance(client, HttpClient):
                # Fast check with short 0.1s timeout
                try:
                    res = client.client.get(f"{client.base_url}/health", timeout=0.1)
                    agents[stage] = res.json() if res.status_code == 200 else {"status": "down"}
                except Exception:
                    agents[stage] = {"status": "ok", "mode": "inproc", "owner": load_manifest(stage)["owner"]}
            else:
                agents[stage] = {"status": "ok", "mode": "inproc"}
        except Exception as exc:
            agents[stage] = {"status": "ok", "mode": "inproc"}
    database = {"status": "ok"}
    conn = None
    try:
        conn = get_connection()
        database["engine"] = "postgresql" if is_postgres_connection(conn) else "sqlite"
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:
        database = {"status": "down", "error": str(exc)[:200]}
    finally:
        if conn is not None:
            conn.close()
    ok = database["status"] == "ok" and all(a["status"] == "ok" for a in agents.values())
    return {
        "status": "ok" if ok else "degraded",
        "flow": load_flow(FLOW)["flow_id"],
        "database": database,
        "agents": agents,
    }


@app.get("/metrics")
def get_metrics(request: Request, org_id: str | None = None) -> dict:
    org_id = _authorized_org(request, org_id)
    summary = dashboard_api.build_dashboard_summary(org_id, STORE, "30d")
    return {
        "org_id": org_id,
        "generated_at": summary["generated_at"],
        "kpis": summary["kpis"],
        "agent_performance": summary["agent_performance"],
        "operational_health": summary["operational_health"],
    }


@app.get("/dashboard/summary")
def dashboard_summary(
    request: Request,
    org_id: str | None = None,
    range: str = "30d",
    start: str | None = None,
    end: str | None = None,
) -> dict:
    org_id = _authorized_org(request, org_id)
    return dashboard_api.build_dashboard_summary(org_id, STORE, range, start, end)


@app.get("/dashboard/timeseries")
def dashboard_timeseries(
    request: Request,
    org_id: str | None = None,
    range: str = "30d",
    start: str | None = None,
    end: str | None = None,
) -> dict:
    org_id = _authorized_org(request, org_id)
    return dashboard_api.build_timeseries(org_id, STORE, range, start, end)


@app.get("/dashboard/activity")
def dashboard_activity(request: Request, org_id: str | None = None, limit: int = 50) -> list:
    org_id = _authorized_org(request, org_id)
    return dashboard_api.build_activity_feed(org_id, STORE, min(limit, 100))


@app.get("/dashboard/locations")
def dashboard_locations(request: Request, org_id: str | None = None) -> dict:
    org_id = _authorized_org(request, org_id)
    return dashboard_api.build_location_summary(org_id)


@app.get("/dashboard/agents/{stage}")
def agent_dashboard(
    stage: str,
    request: Request,
    org_id: str | None = None,
    range: str = "30d",
    verdict: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 25,
    sort: str = "updated_desc",
) -> dict:
    org_id = _authorized_org(request, org_id)
    try:
        return dashboard_api.build_agent_dashboard(
            org_id, STORE, stage, range, verdict, status, search, page, page_size, sort,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/workflows")
def list_workflows(request: Request, org_id: str | None = None) -> list[dict]:
    authorized_org = _authorized_org(request, org_id)
    flow = load_flow(FLOW)
    workflows = STORE.list_workflows(authorized_org)
    for workflow in workflows:
        if _reconcile_workflow_routing(workflow, flow):
            STORE.save_workflow(workflow)
    return workflows


@app.post("/workflows")
def create(body: dict, request: Request) -> dict:
    org = _authorized_org(request, body.get("org_id"))
    body["org_id"] = org
    subject = body.get("subject_id") or body.get("unit_id")
    if not subject:
        raise HTTPException(422, "unit_id (or subject_id) is required")
    
    sku = body.get("sku")
    if not sku:
        raise HTTPException(422, "sku is required")

    route_raw = (body.get("route") or "fba").lower()
    is_returned = bool(body.get("returned", False))
    attrs = body.get("attributes") or {}
    if body.get("fee_lines"):
        attrs = {**attrs, "fee_lines": body["fee_lines"]}

    from orchestration.db import ensure_organization

    ensure_organization(org, body.get("org_name", org))
    save_unit_db(
        unit_id=subject,
        org_id=org,
        sku=sku,
        expected_quantity=int(body.get("expected_qty", 1)),
        variant=body.get("variant"),
        fnsku=body.get("fnsku"),
        order_id=body.get("order_id"),
        channel=route_raw,
        is_returned=is_returned,
        attributes=attrs,
    )

    case = {
        "org_id": org,
        "unit_id": subject,
        "route": route_raw,
        "returned": is_returned,
        "sku": sku,
        "expected_qty": int(body.get("expected_qty", 1)),
        "expected_cartons": int(body.get("expected_cartons", 1)),
        **{k: v for k, v in body.items() if k not in ("org_id", "unit_id", "subject_id")},
    }
    
    wf = run_workflow(case, load_flow(FLOW), STORE)
    return wf


@app.post("/units")
def create_unit(body: dict, request: Request) -> dict:
    """Register a unit and create its pending passport without running any agent."""
    org = _authorized_org(request, body.get("org_id"))
    body["org_id"] = org
    subject = body.get("subject_id") or body.get("unit_id")
    sku = body.get("sku")
    if not isinstance(subject, str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", subject):
        raise HTTPException(422, "unit_id must contain only letters, numbers, dots, underscores, or hyphens")
    if not isinstance(org, str) or not org.strip():
        raise HTTPException(422, "org_id is required")
    if not isinstance(sku, str) or not sku.strip():
        raise HTTPException(422, "sku is required")
    route = (body.get("route") or "fba").lower()
    if route not in {"fba", "mfn"}:
        raise HTTPException(422, "route must be fba or mfn")
    expected_qty = body.get("expected_qty", 1)
    if isinstance(expected_qty, bool) or not isinstance(expected_qty, int) or expected_qty < 1:
        raise HTTPException(422, "expected_qty must be a positive integer")
    returned = bool(body.get("returned", False))
    attrs = body.get("attributes") or {}
    if body.get("fee_lines"):
        attrs = {**attrs, "fee_lines": body["fee_lines"]}

    from orchestration.db import ensure_organization

    ensure_organization(org, body.get("org_name", org))
    save_unit_db(
        unit_id=subject,
        org_id=org,
        sku=sku.strip(),
        expected_quantity=expected_qty,
        variant=body.get("variant"),
        fnsku=body.get("fnsku"),
        order_id=body.get("order_id"),
        channel=route,
        is_returned=returned,
        attributes=attrs,
    )
    case = {
        "org_id": org,
        "unit_id": subject,
        "route": route,
        "returned": returned,
        "sku": sku.strip(),
        "expected_qty": expected_qty,
        "expected_cartons": body.get("expected_cartons", 1),
        **{k: v for k, v in body.items() if k not in ("org_id", "unit_id", "subject_id")},
    }
    flow = load_flow(FLOW)
    wf = STORE.load_workflow(workflow_id_for(case)) or new_workflow(case, flow)
    _reconcile_workflow_routing(wf, flow)
    STORE.save_workflow(wf)
    return wf


def _get(workflow_id: str) -> dict:
    wf = STORE.load_workflow(workflow_id)
    if wf is None:
        raise HTTPException(404, f"no workflow {workflow_id}")
    return wf


def _reconcile_workflow_routing(wf: dict, flow: dict) -> bool:
    context = wf.get("context") or {}
    case = {
        "org_id": wf["org_id"],
        "unit_id": wf["subject_id"],
        "route": str(context.get("route") or "fba").lower(),
        "returned": bool(context.get("returned", False)),
    }
    changed = False
    steps = {step["stage"]: step for step in flow["steps"]}
    for result in wf.get("stage_results") or []:
        step = steps.get(result.get("stage"))
        if step is None or result.get("state") not in {"pending", "skipped"}:
            continue
        is_applicable, reason = applies(step, case)
        if is_applicable and result["state"] == "skipped":
            result.update({"state": "pending", "skipped_reason": None})
            changed = True
        elif not is_applicable and result["state"] == "pending":
            result.update({"state": "skipped", "skipped_reason": reason})
            changed = True
    return changed


def _get_for_org(workflow_id: str, request: Request) -> dict:
    wf = _get(workflow_id)
    _authorized_org(request, wf["org_id"])
    if _reconcile_workflow_routing(wf, load_flow(FLOW)):
        STORE.save_workflow(wf)
    return wf


@app.get("/workflows/{workflow_id}")
def get(workflow_id: str, request: Request) -> dict:
    return _get_for_org(workflow_id, request)


@app.post("/workflows/{workflow_id}/run")
def run_full_workflow(workflow_id: str, request: Request) -> dict:
    _get_for_org(workflow_id, request)
    return resume(workflow_id, load_flow(FLOW), STORE)


@app.get("/workflows/{workflow_id}/evidence")
def evidence(workflow_id: str, request: Request) -> dict:
    wf = _get_for_org(workflow_id, request)
    return {
        **bundle(wf, STORE),
        "source_records": get_source_records_for_unit(wf["subject_id"], wf["org_id"]),
    }


@app.post("/workflows/{workflow_id}/resume")
def resume_workflow(workflow_id: str, request: Request) -> dict:
    _get_for_org(workflow_id, request)
    return resume(workflow_id, load_flow(FLOW), STORE)


@app.post("/workflows/{workflow_id}/overrides")
def override(workflow_id: str, body: dict, request: Request) -> dict:
    _get_for_org(workflow_id, request)
    try:
        res = apply_override(
            workflow_id,
            STORE,
            record_id=body.get("record_id", ""),
            new_verdict=body.get("new_verdict", ""),
            actor=body.get("actor", "human_operator"),
            reason=body.get("reason", "Manual human review override"),
            new_outcome=body.get("new_outcome"),
        )
        save_human_review_db(
            review_id=f"REV-{int(time.time())}",
            exception_id=body.get("record_id", ""),
            workflow_id=workflow_id,
            stage=body.get("stage", "review"),
            old_verdict="FAIL",
            new_verdict=body.get("new_verdict", "PASS"),
            reason=body.get("reason", "Manual review override"),
            actor=body.get("actor", "human_operator"),
        )
        return res
    except (ValueError, EvidenceConflict) as exc:
        raise HTTPException(422, str(exc)) from exc


# ---------------------------------------------------------------------------
# Live Interactive Agent Inspection Endpoints
# ---------------------------------------------------------------------------

def _persist_captures(unit_id: str, stage: str, captures: object) -> list[dict]:
    if captures is None:
        return []
    if not isinstance(captures, list):
        raise HTTPException(422, "captures must be a list")
    if len(captures) > 12:
        raise HTTPException(422, "A maximum of 12 captures is allowed per inspection")

    prepared = []
    total_bytes = 0
    for capture in captures:
        if not isinstance(capture, dict):
            raise HTTPException(422, "Each capture must be an object")
        name = capture.get("filename")
        data = capture.get("content_base64")
        if not isinstance(name, str) or not isinstance(data, str):
            raise HTTPException(422, "Each capture needs filename and content_base64")
        try:
            content = base64.b64decode(data, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(422, f"Capture {name!r} is not valid base64") from exc
        total_bytes += len(content)
        if len(content) > 8 * 1024 * 1024 or total_bytes > 32 * 1024 * 1024:
            raise HTTPException(413, "Capture files must be at most 8 MB each and 32 MB total")

        extension = Path(name).suffix.lower()
        if stage == "recovery":
            if extension != ".csv":
                raise HTTPException(422, "Recovery reports must be CSV files")
            kind, safe_suffix = "document", ".csv"
        else:
            if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
                raise HTTPException(422, f"Unsupported image type for {name!r}")
            kind, safe_suffix = "image", extension
        shot = re.sub(r"[^A-Za-z0-9_-]", "-", str(capture.get("shot") or "capture"))[:40]
        digest = hashlib.sha256(content).hexdigest()
        prepared.append((f"{shot}-{uuid.uuid4().hex}{safe_suffix}", content, kind, digest))

    inputs = []
    target = INPUT_ROOT / unit_id / stage
    target.mkdir(parents=True, exist_ok=True)
    for filename, content, kind, digest in prepared:
        path = target / filename
        path.write_bytes(content)
        inputs.append({
            "ref": path.relative_to(INPUT_ROOT).as_posix(),
            "kind": kind,
            "sha256": digest,
        })
    return inputs


def _execute_stage_inspection(unit_id: str, stage: str, stage_input_data: dict) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", unit_id):
        raise HTTPException(422, "unit_id must contain only letters, numbers, dots, underscores, or hyphens")
    org_id = stage_input_data.get("org_id", "org_demo_alpha")
    route_raw = (stage_input_data.get("route") or "fba").lower()
    user_inputs = {k: v for k, v in stage_input_data.items() if k not in ("captures", "inputs")}
    profile = get_unit_profile(org_id, unit_id)
    profile_context = {}
    if profile:
        profile_context = {
            **(profile.get("attributes") or {}),
            "sku": profile.get("sku"),
            "expected_qty": profile.get("expected_quantity", 1),
            "variant": profile.get("variant"),
            "fnsku": profile.get("fnsku"),
            "order_id": profile.get("order_id"),
        }
    case = {
        "org_id": org_id,
        "unit_id": unit_id,
        "route": route_raw,
        "returned": bool(stage_input_data.get("returned", False)),
        **profile_context,
        **user_inputs,
    }
    case["route"] = route_raw

    flow = load_flow(FLOW)
    wf_id = workflow_id_for(case)
    wf = STORE.load_workflow(wf_id) or new_workflow(case, flow)
    _reconcile_workflow_routing(wf, flow)

    stage_idx = next((i for i, s in enumerate(wf["stage_results"]) if s["stage"] == stage), None)
    if stage_idx is None:
        raise HTTPException(422, f"stage {stage!r} is not part of the configured workflow")
    sr = wf["stage_results"][stage_idx]
    if sr["state"] == "skipped":
        raise HTTPException(409, f"stage {stage!r} is not applicable to this unit: {sr.get('skipped_reason')}")
    return_prerequisites = ("receiving",)
    if route_raw == "fba":
        return_prerequisites += ("prep", "pack")
    elif route_raw == "mfn":
        return_prerequisites += ("pack",)
    prerequisites = {
        "prep": ("receiving",),
        "pack": ("receiving", "prep") if route_raw == "fba" else ("receiving",),
        "returns": return_prerequisites,
    }.get(stage, ())
    completed_stages = {
        item["stage"] for item in wf["stage_results"]
        if item.get("state") == "completed" and item.get("evidence_status") == "completed"
    }
    missing_stages = [required for required in prerequisites if required not in completed_stages]
    if missing_stages:
        raise HTTPException(
            409,
            f"Run and complete the upstream stage(s) first: {', '.join(missing_stages)}",
        )

    prev_ev = _previous_evidence(wf, stage_idx, STORE)

    req_id = f"{wf_id}:{stage}:live_{time.time_ns()}"
    inputs = _persist_captures(unit_id, stage, stage_input_data.get("captures"))
    if not inputs:
        inputs = stage_input_data.get("inputs", [])
    user_inputs["record_id"] = f"{STAGE_PREFIX[stage]}-{unit_id}-{uuid.uuid4().hex[:12]}"
    user_inputs.setdefault("captured_at", utcnow())
    request = {
        "schema_version": "1.0",
        "request_id": req_id,
        "workflow_id": wf_id,
        "stage": stage,
        "subject": {
            "org_id": org_id,
            "subject_id": unit_id,
            "route": case["route"],
        },
        "inputs": inputs,
        "previous_evidence": prev_ev,
        "context": {"overrides": wf["overrides"], "case": case, "user_inputs": user_inputs},
    }

    t0 = time.monotonic()
    logger.info(f"Execution started for stage '{stage}', unit '{unit_id}', request_id '{req_id}'")

    client = client_for(stage)
    try:
        out = client.run(request, timeout_s=30)
    except Exception as exc:
        logger.exception("Inspection failed for stage '%s', unit '%s'", stage, unit_id)
        out = pending_output(
            request,
            code="inspection_failed",
            message=f"{type(exc).__name__}: {exc}",
            retryable=False,
            agent_id=sr.get("agent_id"),
        )
    latency_ms = int((time.monotonic() - t0) * 1000)

    ev = out["evidence"]
    try:
        STORE.put_evidence(ev)
    except EvidenceConflict as exc:
        raise HTTPException(409, str(exc)) from exc

    if ev["record_id"] not in wf["evidence_references"]:
        wf["evidence_references"].append(ev["record_id"])

    sr.update({
        "agent_id": ev["agent_id"],
        "record_id": ev["record_id"],
        "evidence_status": ev["status"],
        "verdict": ev["decision"]["verdict"],
        "outcome": ev["decision"]["outcome"],
        "needs_human": ev["decision"].get("needs_human"),
        "state": "completed" if ev["status"] == "completed" else "error",
        "finished_at": utcnow(),
        "duration_ms": latency_ms,
    })
    if ev.get("error"):
        wf["errors"].append(ev["error"])

    wf["current_stage"] = stage
    STORE.save_workflow(wf)
    _finalize(wf, STORE)

    logger.info(f"Execution completed for '{stage}', unit '{unit_id}': verdict={ev['decision']['verdict']}, latency={latency_ms}ms")

    return {"workflow": wf, "output": out, "evidence": ev}


@app.post("/inspect/receiving")
def inspect_receiving(body: dict, request: Request) -> dict:
    body["org_id"] = _authorized_org(request, body.get("org_id"))
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "receiving", body)


@app.post("/inspect/prep")
def inspect_prep(body: dict, request: Request) -> dict:
    body["org_id"] = _authorized_org(request, body.get("org_id"))
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "prep", body)


@app.post("/inspect/pack")
def inspect_pack(body: dict, request: Request) -> dict:
    body["org_id"] = _authorized_org(request, body.get("org_id"))
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "pack", body)


@app.post("/inspect/returns")
def inspect_returns(body: dict, request: Request) -> dict:
    body["org_id"] = _authorized_org(request, body.get("org_id"))
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "returns", body)


@app.post("/inspect/recovery")
def inspect_recovery(body: dict, request: Request) -> dict:
    body["org_id"] = _authorized_org(request, body.get("org_id"))
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "recovery", body)
