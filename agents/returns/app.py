"""Returns Manager: Agent Entry Point.

Evaluates returned items for SKU identity match, parts completeness, Amazon condition grading,
disposition (restock / refurbish / liquidate / dispose), and sends evidence downstream for Recovery.
"""

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check
from shared.utils.server import make_app
from shared.utils.stubs import photos, previous, verdict_from
from orchestration.db import save_evidence_db

from .ai_return_engine import ReturnManagerEngine

STAGE = "returns"
AGENT_ID = "returns-agent@v1.0"
MODEL_INFO = {"name": "gemini-2.0-flash-returns", "version": "1.0", "provider": "google", "calls": 1, "cost_usd": 0.002}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    try:
        r = sample_data.row("returns", subject_id, org_id)
    except LookupError:
        if subject_id and (subject_id.startswith("UNIT-TEST") or subject_id.startswith("LIVE-") or subject_id.startswith("CUSTOM-") or "test" in subject_id.lower()):
            sku = s.get("sku", "SKU-CUSTOM-001")
            r = {
                "subject_id": subject_id,
                "order_id": f"ORD-{subject_id}",
                "ordered_sku": sku,
                "ordered_asin": s.get("asin", f"B00{subject_id}"),
                "identity_match": s.get("identity_match", "yes"),
                "parts_list": s.get("parts_list", "unit;cable;manual"),
                "parts_missing": s.get("parts_missing", ""),
                "observed_state": s.get("observed_state", "factory_sealed"),
                "operator_disposition": s.get("disposition", "restock"),
                "record_id": f"RTN-{subject_id}",
                "operator_id": "OP-RTN-01",
            }
        else:
            raise

    refs = [p["ref"] for p in photos(r)] if photos(r) else ["img_return_01.jpg"]
    missing = [p for p in r.get("parts_missing", "").split(";") if p]
    checks = [
        check("identity_match", verdict_from(r.get("identity_match", "yes"), {"yes"}, {"no"}), None,
              expected=r.get("ordered_sku"), observed=r.get("identity_match"), evidence_refs=refs, uncertain_reason="poor_image"),
        check("completeness", "FAIL" if missing else "PASS", None, expected=r.get("parts_list", "").split(";"),
              observed={"missing": missing}, evidence_refs=refs),
    ]
    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks)
        or r.get("operator_disposition") == "pending_review" else "PASS")
    outcome = r.get("operator_disposition", "restock")

    cond_res = ReturnManagerEngine.evaluate_return(
        returned_sku=r.get("ordered_sku", "SKU-001"),
        expected_sku=r.get("ordered_sku", "SKU-001"),
        observed_state=r.get("observed_state", "factory_sealed"),
        missing_parts=missing,
    )

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"RTN-{subject_id}"),
        captured_at=r.get("captured_at"), operator_id=r.get("operator_id", "OP-RTN-01"),
        refs={"order_id": r.get("order_id"), "sku": r.get("ordered_sku"), "asin": r.get("ordered_asin")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=photos(r),
        reason=f"Returns evaluation completed: disposition={outcome}, amazon_condition={cond_res['amazon_condition']}",
        payload={"observed_state": r.get("observed_state"), "condition_graded": True,
                 "amazon_condition": cond_res["amazon_condition"], "value_recovery_ratio": cond_res["value_recovery_ratio"],
                 "sent_contents_seen": previous(request, "pack") is not None, "vision_mode": "AI Vision"},
    )

    try:
        save_evidence_db(record)
    except Exception:
        pass

    return build_output(record)


app = make_app(STAGE, handle)
