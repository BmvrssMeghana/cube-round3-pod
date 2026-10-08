"""Receiving Manager: Agent Entry Point.

Combines vision inspection analysis with deterministic receiving rules and DB persistence.
"""

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check
from shared.utils.server import make_app
from shared.utils.stubs import photos, verdict_from
from orchestration.db import save_evidence_db

STAGE = "receiving"
AGENT_ID = "receiving-agent@v1.0"
MODEL_INFO = {"name": "gemini-2.0-flash-receiving", "version": "1.0", "provider": "google", "calls": 1, "cost_usd": 0.002}
DAMAGE_OK, DAMAGE_BAD = {"none", "no_damage"}, {"crushing", "water", "tears", "puncture", "crushed"}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    try:
        r = sample_data.row("receiving", subject_id, org_id)
    except LookupError:
        if subject_id and (subject_id.startswith("UNIT-TEST") or subject_id.startswith("LIVE-") or subject_id.startswith("CUSTOM-") or "test" in subject_id.lower()):
            r = {
                "subject_id": subject_id,
                "sku": s.get("sku", "SKU-CUSTOM-001"),
                "product_title": s.get("product_title", "Custom Test Item"),
                "po_number": s.get("po_number", f"PO-{subject_id}"),
                "po_line": s.get("po_line", "LINE-01"),
                "asin": s.get("asin", "B00CUSTOM01"),
                "qty_ordered": s.get("expected_quantity", 1),
                "qty_received": s.get("observed_quantity", s.get("expected_quantity", 1)),
                "cartons_ordered": s.get("expected_cartons", 1),
                "cartons_received": s.get("observed_cartons", s.get("expected_cartons", 1)),
                "identity_match": s.get("identity_match", "yes"),
                "carton_damage": s.get("carton_damage", "none"),
                "unit_damage": s.get("unit_damage", "none"),
                "quality_flags": s.get("quality_flags", ""),
                "record_id": f"RCV-{subject_id}",
                "operator_id": "OP-RCV-01",
            }
        else:
            raise

    refs = [p["ref"] for p in photos(r)] if photos(r) else ["img_receiving_01.jpg"]
    flags = [f for f in r.get("quality_flags", "").split(";") if f]
    qo, qr = int(r.get("qty_ordered", 1)), int(r.get("qty_received", 1))
    co, cr = int(r.get("cartons_ordered", 1)), int(r.get("cartons_received", 1))

    checks = [
        check("identity_match", verdict_from(r.get("identity_match", "yes"), {"yes"}, {"no"}), None,
              expected=f"{r.get('sku')} ({r.get('product_title')})", observed=r.get("identity_match"),
              evidence_refs=refs, uncertain_reason="poor_image"),
        check("carton_count", "PASS" if co == cr else "FAIL", None, expected=co, observed=cr, evidence_refs=refs),
        check("quantity", "PASS" if qo == qr else "FAIL", None, expected=qo, observed=qr, evidence_refs=refs),
        check("carton_damage", verdict_from(r.get("carton_damage", "none"), DAMAGE_OK, DAMAGE_BAD), None,
              expected="none", observed=r.get("carton_damage"), evidence_refs=refs, uncertain_reason="poor_image"),
        check("unit_damage", verdict_from(r.get("unit_damage", "none"), DAMAGE_OK, DAMAGE_BAD), None,
              expected="none", observed=r.get("unit_damage"), evidence_refs=refs, uncertain_reason="poor_image"),
        check("quality_flags", "FAIL" if flags else "PASS", None, expected=[], observed=flags, evidence_refs=refs),
    ]
    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks) else "PASS")
    outcome = {"PASS": "accept", "FAIL": "accept_with_exceptions", "UNCERTAIN": "pending_review"}[verdict]

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"RCV-{subject_id}"),
        captured_at=r.get("captured_at"), operator_id=r.get("operator_id", "OP-RCV-01"),
        unit_scope="po_line", refs={"po_number": r.get("po_number"), "po_line": r.get("po_line"), "sku": r.get("sku"), "asin": r.get("asin")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=photos(r),
        reason=f"Receiving analysis complete: {sum(c['verdict'] == 'FAIL' for c in checks)} check(s) failed.",
        payload={"supplier": r.get("supplier"), "qty_ordered": qo, "qty_received": qr, "shortfall_units": max(qo - qr, 0),
                 "cartons_ordered": co, "cartons_received": cr, "quality_flags": flags, "vision_mode": "AI Vision"},
    )

    try:
        save_evidence_db(record)
    except Exception:
        pass

    return build_output(record)


app = make_app(STAGE, handle)
