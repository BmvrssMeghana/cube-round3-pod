"""Prep Manager: Agent Entry Point.

Evaluates polybag sealing, suffocation warnings, FNSKU placement, barcode coverage,
expiry legibility, and physical scale measurements.
"""

import json
from pathlib import Path

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, previous, verdict_from
from orchestration.db import save_evidence_db

from .specialists import run_prep_pipeline

STAGE = "prep"
AGENT_ID = "prep-agent@v1.0"
MODEL_INFO = {"name": "prep-specialist-orchestrator-v1", "version": "1.0", "provider": "cube_specialist_pod", "calls": 6, "cost_usd": 0.002}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("prep", request)

    input_records = captures(request, r)
    spec_result = run_prep_pipeline(request, r, input_records)

    verdict = spec_result["verdict"]
    outcome = spec_result["outcome"]
    checks = spec_result["checks"]
    rule_table = spec_result["rule_table"]

    measurements = r.get("measurements") or {"weight_oz": 14.2, "dimensions_in": [8.0, 5.0, 2.5]}

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"PRP-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-PRP-01"),
        refs={"work_order_id": r.get("work_order_id"), "fba_shipment_id": r.get("fba_shipment_id"),
              "sku": r.get("sku"), "asin": r.get("asin"), "fnsku": r.get("fnsku")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Prep 6-Specialist inspection complete: {sum(c['verdict'] == 'FAIL' for c in checks)} failed check(s).",
        payload={
            "prep_price_usd": float(r.get("prep_price_usd", 0.75)),
            "measurements": measurements,
            "rule_source": "data/prep_requirements.json@v1.0",
            "rule_by_rule": rule_table,
            "checked_rule_ids": [item["rule_id"] for item in rule_table if item["status"] in {"PASS", "FAIL", "UNCERTAIN"}],
            "not_checkable_rule_ids": [item["rule_id"] for item in rule_table if item["status"] == "NOT_CHECKABLE"],
            "adaptive_prep_plan": spec_result.get("adaptive_prep_plan"),
            "rework_prevention_map": spec_result.get("rework_prevention_map"),
            "specialist_executions": spec_result["specialist_executions"],
            "pipeline_mode": "Agentic Multi-Specialist Orchestration (PRP-1..6)",
        },
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
