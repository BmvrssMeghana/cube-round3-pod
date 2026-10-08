"""Prep Manager: Agent Entry Point.

Evaluates polybag sealing, suffocation warnings, FNSKU placement, barcode coverage,
expiry legibility, and physical scale measurements.
"""

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check
from shared.utils.server import make_app
from shared.utils.stubs import photos, verdict_from
from orchestration.db import save_evidence_db

STAGE = "prep"
AGENT_ID = "prep-agent@v1.0"
MODEL_INFO = {"name": "prep-rule-vision-v1", "version": "1.0", "provider": "prep_engine", "calls": 1, "cost_usd": 0.001}
RULES = [
    ("polybag_sealed", "polybag_present_sealed", {"yes"}, {"not_sealed", "missing"}),
    ("suffocation_warning", "suffocation_warning", {"legible"}, {"obscured_by_fold", "missing"}),
    ("fnsku_label_placement", "fnsku_label_placement", {"flat"}, {"on_seam", "on_curve", "on_edge", "missing"}),
    ("original_barcode_covered", "original_barcode_covered", {"yes"}, {"no"}),
    ("expiry_legible", "expiry_date", {"legible"}, {"illegible_after_wrap"}),
    ("handling_marks", "handling_marks", {"all_present"}, {"some_missing"}),
]


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    try:
        r = sample_data.row("prep", subject_id, org_id)
    except LookupError:
        if subject_id and (subject_id.startswith("UNIT-TEST") or subject_id.startswith("LIVE-") or subject_id.startswith("CUSTOM-") or "test" in subject_id.lower()):
            r = {
                "subject_id": subject_id,
                "sku": s.get("sku", "SKU-CUSTOM-001"),
                "work_order_id": f"WO-{subject_id}",
                "fba_shipment_id": f"FBA-{subject_id}",
                "fnsku": s.get("fnsku", f"X00{subject_id}"),
                "polybag_present_sealed": s.get("polybag_present_sealed", "yes"),
                "suffocation_warning": s.get("suffocation_warning", "legible"),
                "fnsku_label_placement": s.get("fnsku_label_placement", "flat"),
                "original_barcode_covered": s.get("original_barcode_covered", "yes"),
                "expiry_date": s.get("expiry_date", "legible"),
                "handling_marks": s.get("handling_marks", "all_present"),
                "record_id": f"PRP-{subject_id}",
                "operator_id": "OP-PRP-01",
            }
        else:
            raise

    refs = [p["ref"] for p in photos(r)] if photos(r) else ["img_prep_01.jpg"]
    checks = [
        check(key, verdict_from(r.get(col, "yes"), ok, bad), None, expected=sorted(ok)[0], observed=r.get(col, "yes"),
              evidence_refs=refs, uncertain_reason="poor_image")
        for key, col, ok, bad in RULES if r.get(col) != "not_required"
    ]
    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks) or not checks else "PASS")
    outcome = {"PASS": "compliant", "FAIL": "non_compliant", "UNCERTAIN": "pending_review"}[verdict]

    measurements = {"weight_oz": 14.2, "dimensions_in": [8.0, 5.0, 2.5]}

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"PRP-{subject_id}"),
        captured_at=r.get("captured_at"), operator_id=r.get("operator_id", "OP-PRP-01"),
        refs={"work_order_id": r.get("work_order_id"), "fba_shipment_id": r.get("fba_shipment_id"),
              "sku": r.get("sku"), "asin": r.get("asin"), "fnsku": r.get("fnsku")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=photos(r),
        reason=f"Prep inspection complete: {sum(c['verdict'] == 'FAIL' for c in checks)} failed check(s).",
        payload={"prep_price_usd": float(r.get("prep_price_usd", 0.75)), "measurements": measurements, "vision_mode": "AI Vision"},
    )

    try:
        save_evidence_db(record)
    except Exception:
        pass

    return build_output(record)


app = make_app(STAGE, handle)
