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

STAGE = "returns"
AGENT_ID = "returns-agent@v1.0"
MODEL_INFO = {"name": "returns-condition-rules-v1", "version": "1.0", "provider": "cube_rules", "calls": 0, "cost_usd": 0}


def _parts(value: object) -> list[str]:
    if isinstance(value, str):
        return [part.strip() for part in value.split(";") if part.strip()]
    if isinstance(value, (list, tuple, set)):
        return [str(part).strip() for part in value if str(part).strip()]
    return []


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("returns", request)

    input_records = captures(request, r)
    refs = [p["ref"] for p in input_records] or ["img_return_01.jpg"]
    missing = _parts(r.get("parts_missing"))
    parts_list = _parts(r.get("parts_list", "unit"))
    returned_sku = r.get("returned_sku", r.get("ordered_sku", "SKU-001"))
    checks = [
        check("identity_match", verdict_from(r.get("identity_match", "yes"), {"yes"}, {"no"}), None,
              expected=r.get("ordered_sku"), observed=returned_sku, evidence_refs=refs, uncertain_reason="poor_image"),
        check("completeness", "FAIL" if missing else "PASS", None, expected=parts_list,
              observed={"missing": missing}, evidence_refs=refs),
    ]
    receiving = previous(request, "receiving")
    if receiving and receiving.get("status") == "completed":
        identity_check = next(
            (item for item in receiving.get("checks", []) if item.get("check_key") == "identity_match"),
            None,
        )
        identity_verdict = identity_check.get("verdict", "UNCERTAIN") if identity_check else "UNCERTAIN"
        if identity_verdict != "PASS":
            checks.append(check(
                "receiving_identity_baseline", identity_verdict, None,
                expected="receiving identity confirmed",
                observed=identity_check.get("observed") if identity_check else "identity check missing",
                detail="The return identity cannot be cleared against unresolved receiving evidence.",
                evidence_refs=[receiving["record_id"]],
                uncertain_reason="conflicting_evidence",
            ))
    for source_stage in ("prep", "pack"):
        outbound = previous(request, source_stage)
        if outbound and outbound.get("status") == "completed" and outbound["decision"]["verdict"] != "PASS":
            checks.append(check(
                f"{source_stage}_outbound_baseline", "UNCERTAIN", None,
                expected=f"{source_stage} evidence cleared before shipment",
                observed=outbound["decision"]["verdict"],
                detail="Earlier outbound evidence requires review before the return can be restocked.",
                evidence_refs=[outbound["record_id"]],
                uncertain_reason="conflicting_evidence",
            ))
    cond_res = ReturnManagerEngine.evaluate_return(
        returned_sku=returned_sku,
        expected_sku=r.get("ordered_sku", "SKU-001"),
        observed_state=r.get("observed_state", "factory_sealed"),
        missing_parts=missing,
    )
    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks)
        or cond_res["disposition"] == "pending_review" else "PASS")
    outcome = "pending_review" if verdict != "PASS" else cond_res["disposition"]

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"RTN-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-RTN-01"),
        refs={"order_id": r.get("order_id"), "sku": r.get("ordered_sku"), "asin": r.get("ordered_asin")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Returns evaluation completed: disposition={outcome}, amazon_condition={cond_res['amazon_condition']}",
        payload={"observed_state": r.get("observed_state"), "condition_graded": True,
                 "amazon_condition": cond_res["amazon_condition"], "value_recovery_ratio": cond_res["value_recovery_ratio"],
                 "sent_contents_seen": previous(request, "pack") is not None,
                 "vision_mode": "rules with operator-entered observations"},
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
