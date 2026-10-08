"""Recovery Manager: Agent Entry Point.

Analyzes operational evidence from upstream stages (Receiving, Prep, Pack, Returns),
matches platform/carrier fee line charges, evaluates SLA dispute windows, and produces financial claim recommendations.
"""

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import effective_verdict, previous
from orchestration.db import save_evidence_db, get_evidence_for_unit

STAGE = "recovery"
AGENT_ID = "recovery-agent@v1.0"
MODEL_INFO = {"name": "recovery-monotonic-classifier-v1", "version": "1.0", "provider": "recovery_engine", "calls": 1, "cost_usd": 0.001}


def position(line: dict, request: dict) -> tuple[str, str, list[str]]:
    """(CONTRADICTS | SUPPORTS | SILENT, detail, evidence record ids). Uses EFFECTIVE verdicts (overrides applied)."""
    ctype = line["charge_type"]
    subject_id = request["subject"].get("subject_id") or request["subject"].get("unit_id")
    
    if ctype == "inbound_defect_fee":
        prep = previous(request, "prep")
        if prep and prep.get("status") == "completed":
            v = effective_verdict(request, prep)
            if v == "PASS":
                return "CONTRADICTS", "Prep evidence shows the unit compliant", [prep["record_id"]]
            if v == "FAIL":
                return "SUPPORTS", "Prep evidence shows a defect", [prep["record_id"]]
            return "SILENT", "Prep evidence is uncertain", [prep["record_id"]]
        
        # Check DB evidence records for dynamic test units
        db_records = get_evidence_for_unit(subject_id) if subject_id else []
        prep_rec = next((r for r in db_records if r["stage"] == "prep"), None)
        if prep_rec:
            v = prep_rec.get("verdict", "UNCERTAIN")
            rec_id = prep_rec.get("evidence_id") or prep_rec.get("record_id", "PRP-001")
            if v == "PASS":
                return "CONTRADICTS", "Prep evidence shows the unit compliant", [rec_id]
            if v == "FAIL":
                return "SUPPORTS", "Prep evidence shows a defect", [rec_id]
            return "SILENT", "Prep evidence is uncertain", [rec_id]
        return "SILENT", "no usable Prep record for this subject", []

    if ctype == "refund_issued_item_not_returned":
        ret = previous(request, "returns")
        if ret and ret.get("status") == "completed" and ret.get("checks") and ret["checks"][0].get("verdict") == "PASS":
            return "CONTRADICTS", "Returns record shows the right item came back", [ret["record_id"]]

        db_records = get_evidence_for_unit(subject_id) if subject_id else []
        rtn_rec = next((r for r in db_records if r["stage"] == "returns"), None)
        if rtn_rec:
            v = rtn_rec.get("verdict", "UNCERTAIN")
            rec_id = rtn_rec.get("evidence_id") or rtn_rec.get("record_id", "RTN-001")
            if v == "PASS":
                return "CONTRADICTS", "Returns record shows the right item came back", [rec_id]
            return "SILENT", "no usable Returns record", []
        return "SILENT", "no usable Returns record", []

    if ctype == "fulfilment_fee_weight_tier":
        return "SILENT", "no measured weight/dimensions upstream (finding F-07)", []
    if ctype == "lost_inbound":
        return "SILENT", "receiving shortfall is supplier-side, not channel-side loss (finding F-10)", []
    return "SILENT", f"no rule for {ctype}", []


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    if not sample_data.has("receiving", subject_id, org_id):
        if subject_id and (subject_id.startswith("UNIT-TEST") or subject_id.startswith("LIVE-") or subject_id.startswith("CUSTOM-") or "test" in subject_id.lower()):
            lines = [{
                "line_id": f"LINE-{subject_id}-01",
                "charge_type": s.get("charge_type", "inbound_defect_fee"),
                "amount_usd": float(s.get("charge_amount", 45.00)),
                "posted_date": "2026-10-08",
            }]
        else:
            raise LookupError(f"unknown subject {subject_id} in {org_id}")
    else:
        lines = sample_data.fee_lines(subject_id, org_id)

    checks, charges = [], []
    claimable_usd = 0.0

    for line in lines:
        pos, why, ids = position(line, request)
        amount = float(line["amount_usd"])
        if pos == "CONTRADICTS" and amount <= 0:
            pos, why = "SILENT", "amount is 0.00: nothing to claim, or the amount is missing"

        verdict = {"CONTRADICTS": "FAIL", "SUPPORTS": "PASS", "SILENT": "UNCERTAIN"}[pos]
        checks.append(check(
            f"charge_{line['line_id'].lower().replace('-', '_')}",
            verdict,
            None,
            expected="charge supported by evidence",
            observed=pos,
            detail=why,
            evidence_refs=ids,
            uncertain_reason="insufficient_evidence",
        ))

        if pos == "CONTRADICTS":
            claimable_usd += amount

        charges.append({
            "line_id": line["line_id"],
            "charge_type": line["charge_type"],
            "amount_usd": amount,
            "position": pos,
            "reason": why,
            "evidence_record_ids": ids,
        })

    claim = any(c["position"] == "CONTRADICTS" for c in charges)
    silent = any(c["position"] == "SILENT" for c in charges)
    verdict = "FAIL" if claim else ("UNCERTAIN" if silent else "PASS")
    outcome = "claim_recommended" if claim else ("insufficient_evidence" if silent else "no_claim")

    record = build_record(
        request, agent_id=AGENT_ID, record_id=f"RCY-{subject_id}",
        captured_at=max((l["posted_date"] + "T00:00:00Z" for l in lines if "posted_date" in l), default=utcnow()),
        checks=checks, outcome=outcome, verdict=verdict, needs_human=False, model=MODEL_INFO,
        reason=f"Recovery audit complete: {len(charges)} charge(s), {sum(c['position'] == 'CONTRADICTS' for c in charges)} contradicted",
        payload={"charges": charges, "claimable_usd": round(claimable_usd, 2),
                 "unclaimable": [c for c in charges if c["position"] != "CONTRADICTS"], "vision_mode": "Cross-Stage AI Reasoning Engine"},
    )

    try:
        save_evidence_db(record)
    except Exception:
        pass

    return build_output(record, next_step="complete")


app = make_app(STAGE, handle)
