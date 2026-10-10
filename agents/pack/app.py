"""Pack Manager: Agent Entry Point.

Performs automated outbound package contents verification, bounding box item detection,
expected order reconciliation, and operational decisions (SEAL / STOP_AND_FIX / MANUAL_REVIEW).
"""

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, previous
from orchestration.db import save_evidence_db

from .specialists import run_pack_pipeline

STAGE = "pack"
AGENT_ID = "pack-agent@v1.0"
MODEL_INFO = {"name": "pack-specialist-orchestrator-v1", "version": "1.0", "provider": "cube_specialist_pod", "calls": 5, "cost_usd": 0.002}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("pack", request)

    input_records = captures(request, r)
    spec_result = run_pack_pipeline(request, r, input_records)

    verdict = spec_result["verdict"]
    pack_out = spec_result["outcome"]
    checks = spec_result["checks"]

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"PCK-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-PCK-01"),
        unit_scope="order", refs={"order_id": r.get("order_id")}, checks=checks, outcome=pack_out,
        verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Pack 5-Specialist inspection: directive={pack_out.upper()}",
        payload={
            "channel": r.get("channel", "FBA"),
            "directive": pack_out.upper(),
            "shipment_readiness_gate": spec_result.get("shipment_readiness_gate"),
            "dispatch_evidence_bundle": spec_result.get("dispatch_evidence_bundle"),
            "specialist_executions": spec_result["specialist_executions"],
            "pipeline_mode": "Agentic Multi-Specialist Orchestration (PCK-1..5)",
        },
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
