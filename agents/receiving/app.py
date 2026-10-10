"""Receiving Manager: Agent Entry Point.

Combines vision inspection analysis with deterministic receiving rules and DB persistence.
"""

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, verdict_from
from orchestration.db import save_evidence_db

from .specialists import run_receiving_pipeline

STAGE = "receiving"
AGENT_ID = "receiving-agent@v1.0"
MODEL_INFO = {"name": "receiving-specialist-orchestrator-v1", "version": "1.0", "provider": "cube_specialist_pod", "calls": 6, "cost_usd": 0.002}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("receiving", request)

    input_records = captures(request, r)
    spec_result = run_receiving_pipeline(request, r, input_records)

    verdict = spec_result["verdict"]
    outcome = spec_result["outcome"]
    checks = spec_result["checks"]
    supplier_claim_draft = spec_result.get("supplier_claim_draft")

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"RCV-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-RCV-01"),
        unit_scope="po_line", refs={"po_number": r.get("po_number"), "po_line": r.get("po_line"), "sku": r.get("sku"), "asin": r.get("asin")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Receiving 6-Specialist evaluation complete: {sum(c['verdict'] == 'FAIL' for c in checks)} check(s) failed.",
        payload={
            "supplier": r.get("supplier"),
            "qty_ordered": int(r.get("qty_ordered") or 24),
            "qty_received": int(r.get("qty_received") or r.get("observed_qty") or 24),
            "cartons_ordered": int(r.get("cartons_ordered") or 1),
            "cartons_received": int(r.get("cartons_received") or 1),
            "identity_baseline": {"sku": r.get("sku"), "variant": r.get("observed_variant") or r.get("variant")},
            "supplier_claim_draft": supplier_claim_draft,
            "reconciliation_matrix": spec_result.get("reconciliation_matrix"),
            "intake_risk": spec_result.get("intake_risk"),
            "specialist_executions": spec_result["specialist_executions"],
            "pipeline_mode": "Agentic Multi-Specialist Orchestration (REC-1..6)",
        },
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
