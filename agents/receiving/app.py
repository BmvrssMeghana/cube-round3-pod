"""Receiving Manager: Agent Entry Point.

Combines vision inspection analysis with deterministic receiving rules and DB persistence.
"""

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, verdict_from
from orchestration.db import save_evidence_db

STAGE = "receiving"
AGENT_ID = "receiving-agent@v1.0"
MODEL_INFO = {"name": "receiving-rules-v1", "version": "1.0", "provider": "cube_rules", "calls": 0, "cost_usd": 0}
DAMAGE_OK, DAMAGE_BAD = {"none", "no_damage"}, {"crushing", "water", "tears", "puncture", "crushed"}


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("receiving", request)

    input_records = captures(request, r)
    refs = [p["ref"] for p in input_records] or ["img_receiving_01.jpg"]
    raw_flags = r.get("quality_flags") or []
    if isinstance(raw_flags, str):
        raw_flags = raw_flags.split(";")
    if not isinstance(raw_flags, list):
        raise TypeError("quality_flags must be a string or list of strings")
    flags = [flag.strip() for flag in raw_flags if isinstance(flag, str) and flag.strip()]
    qo, qr = int(r.get("qty_ordered", 1)), int(r.get("qty_received", 1))
    co, cr = int(r.get("cartons_ordered", 1)), int(r.get("cartons_received", 1))
    units_ordered, units_counted = r.get("units_per_carton_ordered"), r.get("units_per_carton_counted")

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
    if units_ordered is not None or units_counted is not None:
        units_verdict = (
            "UNCERTAIN" if units_ordered is None or units_counted is None
            else "PASS" if int(units_ordered) == int(units_counted)
            else "FAIL"
        )
        checks.append(check(
            "units_per_carton", units_verdict, None, expected=units_ordered, observed=units_counted,
            evidence_refs=refs, uncertain_reason="occluded",
        ))
    expected_variant = r.get("expected_variant")
    observed_variant = r.get("observed_variant")
    if expected_variant or observed_variant:
        variant_verdict = (
            "UNCERTAIN" if not expected_variant or not observed_variant
            else "PASS" if str(expected_variant).strip().casefold() == str(observed_variant).strip().casefold()
            else "FAIL"
        )
        checks.append(check(
            "variant_match", variant_verdict, None,
            expected=expected_variant, observed=observed_variant, evidence_refs=refs,
            uncertain_reason="poor_image",
        ))
    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks) else "PASS")
    outcome = {"PASS": "accept", "FAIL": "accept_with_exceptions", "UNCERTAIN": "pending_review"}[verdict]

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"RCV-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-RCV-01"),
        unit_scope="po_line", refs={"po_number": r.get("po_number"), "po_line": r.get("po_line"), "sku": r.get("sku"), "asin": r.get("asin")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Receiving analysis complete: {sum(c['verdict'] == 'FAIL' for c in checks)} check(s) failed.",
        payload={"supplier": r.get("supplier"), "qty_ordered": qo, "qty_received": qr, "shortfall_units": max(qo - qr, 0),
                 "cartons_ordered": co, "cartons_received": cr, "quality_flags": flags,
                 "identity_baseline": {"sku": r.get("sku"), "variant": observed_variant or expected_variant, "received_qty": qr},
                 "supplier_claim_draft": (
                     f"PO {r.get('po_number')}: received {qr} of {qo} expected units."
                     if verdict == "FAIL" and qr != qo else None
                 ),
                 "vision_mode": "rules with operator-entered observations"},
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
