"""Recovery Manager: Agent Entry Point.

Analyzes operational evidence from upstream stages (Receiving, Prep, Pack, Returns),
matches platform/carrier fee line charges, evaluates SLA dispute windows, and produces financial claim recommendations.
"""

from shared.utils.agent_context import resolve_fee_lines
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, effective_verdict, previous
from orchestration.db import save_evidence_db, get_evidence_for_unit

from .specialists import run_recovery_pipeline

STAGE = "recovery"
AGENT_ID = "recovery-agent@v1.0"
MODEL_INFO = {"name": "recovery-specialist-orchestrator-v1", "version": "1.0", "provider": "cube_specialist_pod", "calls": 7, "cost_usd": 0.002}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    user_inputs = (request.get("context") or {}).get("user_inputs", {})
    try:
        lines = resolve_fee_lines(request)
    except LookupError:
        if user_inputs.get("charge_type") and user_inputs.get("amount_usd") is not None:
            lines = [{
                "line_id": f"FEE-{subject_id}-01",
                "charge_type": user_inputs.get("charge_type"),
                "amount_usd": float(user_inputs.get("amount_usd", 0)),
                "sku": user_inputs.get("sku", "SKU-BLUE-BOTTLE-001"),
                "already_reimbursed": False,
            }]
        else:
            lines = []
    input_records = captures(request, {})

    spec_result = run_recovery_pipeline(request, lines, user_inputs)

    verdict = spec_result["verdict"]
    outcome = "claim_recommended" if spec_result["total_claim_amount"] > 0 else "no_claim"
    checks = spec_result["checks"]

    record = build_record(
        request, agent_id=AGENT_ID, record_id=f"RCY-{subject_id}",
        captured_at=utcnow(),
        checks=checks, outcome=outcome, verdict=verdict, needs_human=False, model=MODEL_INFO,
        inputs=input_records,
        reason=f"Recovery 7-Specialist audit complete: {spec_result['claim_lines_count']} claimable line(s), Total ${spec_result['total_claim_amount']:.2f}",
        payload={
            "claimable_usd": spec_result["total_claim_amount"],
            "claim_lines_count": spec_result["claim_lines_count"],
            "dispute_letter": spec_result["dispute_letter"],
            "specialist_executions": spec_result["specialist_executions"],
            "pipeline_mode": "Agentic Multi-Specialist Orchestration (RCY-1..7)",
        },
    )

    save_evidence_db(record)

    return build_output(record, next_step="complete")


app = make_app(STAGE, handle)
