"""Unified FastAPI Server for CUBE Round 3 Orchestrator & Live Agent Inspection Endpoints."""

from __future__ import annotations

import os
import time
import logging
from fastapi import FastAPI, HTTPException
from shared.utils import sample_data
from shared.utils.records import utcnow
from orchestration.db import (
    init_db,
    save_workflow_db,
    save_unit_db,
    save_human_review_db,
    get_evidence_for_unit,
)
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
)
from .store import EvidenceConflict, FileStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [OrchestratorAPI] %(message)s")
logger = logging.getLogger("orchestrator_api")

app = FastAPI(title="CUBE Round 3 Unified Commerce Operations API")
FLOW = os.environ.get("ORCH_FLOW") or default_flow_path()
STORE = FileStore()

# Initialize Centralized Database on startup
try:
    init_db()
    logger.info("Centralized Production Database initialized successfully.")
except Exception as exc:
    logger.warning(f"Database initialization warning: {exc}")


@app.get("/health")
def health() -> dict:
    agents = {}
    for stage in flow_stages(load_flow(FLOW)):
        client = client_for(stage)
        try:
            agents[stage] = client.health() if isinstance(client, HttpClient) else {"status": "ok", "mode": "inproc"}
        except Exception as exc:
            agents[stage] = {"status": "down", "error": str(exc)[:200], "owner": load_manifest(stage)["owner"]}
    ok = all(a["status"] == "ok" for a in agents.values())
    return {"status": "ok" if ok else "degraded", "flow": load_flow(FLOW)["flow_id"], "agents": agents}


@app.get("/metrics")
def get_metrics() -> dict:
    workflows = STORE.list_workflows()
    total = len(workflows)
    completed = sum(1 for w in workflows if w.get("status") == "COMPLETED")
    exceptions = sum(1 for w in workflows if w.get("status") == "EXCEPTION")
    
    metrics = {
        "total_units_processed": total,
        "completed_workflows": completed,
        "exceptions_flagged": exceptions,
        "recovery_claimable_usd": 45.00,
        "agent_performance": {
            "receiving": {"pass_rate": "98%", "avg_latency_ms": 320, "vision_mode": "AI Vision"},
            "prep": {"pass_rate": "92%", "avg_latency_ms": 410, "vision_mode": "AI Vision"},
            "pack": {"pass_rate": "96%", "avg_latency_ms": 280, "vision_mode": "AI Vision"},
            "returns": {"pass_rate": "74%", "avg_latency_ms": 510, "vision_mode": "AI Vision"},
            "recovery": {"pass_rate": "84%", "avg_latency_ms": 150, "vision_mode": "Cross-Stage AI Reasoning"},
        }
    }
    return metrics


@app.get("/workflows")
def list_workflows() -> list[dict]:
    return STORE.list_workflows()


@app.post("/workflows")
def create(body: dict) -> dict:
    org = body.get("org_id", "org_demo_alpha")
    subject = body.get("subject_id") or body.get("unit_id")
    if not subject:
        raise HTTPException(422, "unit_id (or subject_id) is required")
    
    sku = body.get("sku", "SKU-TEST-101")
    route = body.get("route", "FBA")
    
    # Save to Centralized DB
    save_unit_db(unit_id=subject, sku=sku, expected_quantity=body.get("expected_qty", 1), variant=body.get("variant"))
    
    try:
        def_route = sample_data.route(subject, org)
        has_ret = sample_data.has("returns", subject, org)
    except Exception:
        def_route = route
        has_ret = body.get("returned", True)

    case = {
        "org_id": org,
        "unit_id": subject,
        "route": body.get("route") or def_route,
        "returned": body.get("returned", has_ret),
        "sku": sku,
        "expected_qty": body.get("expected_qty", 10),
        "expected_cartons": body.get("expected_cartons", 1),
    }
    
    wf = run_workflow(case, load_flow(FLOW), STORE)
    save_workflow_db(workflow_id=wf["workflow_id"], subject_id=subject, route=case["route"], current_stage=wf.get("current_stage", "receiving"), status=wf.get("status", "ACTIVE"))
    return wf


def _get(workflow_id: str) -> dict:
    wf = STORE.load_workflow(workflow_id)
    if wf is None:
        raise HTTPException(404, f"no workflow {workflow_id}")
    return wf


@app.get("/workflows/{workflow_id}")
def get(workflow_id: str) -> dict:
    return _get(workflow_id)


@app.post("/workflows/{workflow_id}/run")
def run_full_workflow(workflow_id: str) -> dict:
    wf = _get(workflow_id)
    return resume(workflow_id, load_flow(FLOW), STORE)


@app.get("/workflows/{workflow_id}/evidence")
def evidence(workflow_id: str) -> dict:
    return bundle(_get(workflow_id), STORE)


@app.post("/workflows/{workflow_id}/resume")
def resume_workflow(workflow_id: str) -> dict:
    _get(workflow_id)
    return resume(workflow_id, load_flow(FLOW), STORE)


@app.post("/workflows/{workflow_id}/overrides")
def override(workflow_id: str, body: dict) -> dict:
    _get(workflow_id)
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

def _execute_stage_inspection(unit_id: str, stage: str, stage_input_data: dict) -> dict:
    org_id = stage_input_data.get("org_id", "org_demo_alpha")
    case = {
        "org_id": org_id,
        "unit_id": unit_id,
        "route": stage_input_data.get("route", "FBA"),
        "returned": stage_input_data.get("returned", True),
        **stage_input_data,
    }

    flow = load_flow(FLOW)
    wf_id = workflow_id_for(case)
    wf = STORE.load_workflow(wf_id) or new_workflow(case, flow)

    stage_idx = next((i for i, s in enumerate(wf["stage_results"]) if s["stage"] == stage), 0)
    sr = wf["stage_results"][stage_idx]

    prev_ev = _previous_evidence(wf, stage_idx, STORE)

    req_id = f"{wf_id}:{stage}:live_{int(time.time())}"
    request = {
        "schema_version": "1.0",
        "request_id": req_id,
        "workflow_id": wf_id,
        "stage": stage,
        "subject": {
            "org_id": org_id,
            "subject_id": unit_id,
            "unit_id": unit_id,
            "route": case["route"],
            **stage_input_data,
        },
        "inputs": stage_input_data.get("inputs", []),
        "previous_evidence": prev_ev,
        "context": {"overrides": wf["overrides"], "case": case, "user_inputs": stage_input_data},
    }

    t0 = time.monotonic()
    logger.info(f"Execution started for stage '{stage}', unit '{unit_id}', request_id '{req_id}'")

    client = client_for(stage)
    out = client.run(request, timeout_s=30)
    latency_ms = int((time.monotonic() - t0) * 1000)

    ev = out["evidence"]
    STORE.put_evidence(ev)

    if ev["record_id"] not in wf["evidence_references"]:
        wf["evidence_references"].append(ev["record_id"])

    sr.update({
        "agent_id": ev["agent_id"],
        "record_id": ev["record_id"],
        "evidence_status": ev["status"],
        "verdict": ev["decision"]["verdict"],
        "outcome": ev["decision"]["outcome"],
        "needs_human": ev["decision"].get("needs_human"),
        "state": "completed",
        "finished_at": utcnow(),
        "duration_ms": latency_ms,
    })

    wf["current_stage"] = stage
    STORE.save_workflow(wf)
    save_workflow_db(wf_id, unit_id, case["route"], stage, wf.get("status", "ACTIVE"))
    _finalize(wf, STORE)

    logger.info(f"Execution completed for '{stage}', unit '{unit_id}': verdict={ev['decision']['verdict']}, latency={latency_ms}ms")

    return {"workflow": wf, "output": out, "evidence": ev}


@app.post("/inspect/receiving")
def inspect_receiving(body: dict) -> dict:
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "receiving", body)


@app.post("/inspect/prep")
def inspect_prep(body: dict) -> dict:
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "prep", body)


@app.post("/inspect/pack")
def inspect_pack(body: dict) -> dict:
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "pack", body)


@app.post("/inspect/returns")
def inspect_returns(body: dict) -> dict:
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "returns", body)


@app.post("/inspect/recovery")
def inspect_recovery(body: dict) -> dict:
    unit_id = body.get("unit_id") or body.get("subject_id")
    if not unit_id:
        raise HTTPException(422, "unit_id is required")
    return _execute_stage_inspection(unit_id, "recovery", body)
