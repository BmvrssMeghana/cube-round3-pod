"""Returns Manager: Agent Entry Point.

Evaluates returned items for SKU identity match, parts completeness, Amazon condition grading,
disposition (restock / refurbish / liquidate / dispose), and sends evidence downstream for Recovery.
"""

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, previous, verdict_from
from orchestration.db import save_evidence_db

from .ai_return_engine import ReturnManagerEngine

from .specialists import run_returns_pipeline

STAGE = "returns"
AGENT_ID = "returns-agent@v1.0"
MODEL_INFO = {"name": "returns-specialist-orchestrator-v1", "version": "1.0", "provider": "cube_specialist_pod", "calls": 6, "cost_usd": 0.002}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("returns", request)

    input_records = captures(request, r)
    spec_result = run_returns_pipeline(request, r, input_records)

    verdict = spec_result["verdict"]
    outcome = spec_result["outcome"]
    checks = spec_result["checks"]

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"RTN-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-RTN-01"),
        refs={"order_id": r.get("order_id"), "sku": r.get("ordered_sku"), "asin": r.get("ordered_asin")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Returns 6-Specialist evaluation complete: disposition={outcome}, condition={spec_result['amazon_condition']}",
        payload={
            "observed_state": r.get("observed_state", "factory_sealed"),
            "condition_graded": True,
            "amazon_condition": spec_result["amazon_condition"],
            "value_recovery_ratio": spec_result["value_recovery_ratio"],
            "disposition": outcome,
            "condition_diff": spec_result.get("condition_diff"),
            "disposition_advisor": spec_result.get("disposition_advisor"),
            "specialist_executions": spec_result["specialist_executions"],
            "pipeline_mode": "Agentic Multi-Specialist Orchestration (RTN-1..6)",
        },
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
