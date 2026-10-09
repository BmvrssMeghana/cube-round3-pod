"""Recovery Manager: Agent Entry Point.

Analyzes operational evidence from upstream stages (Receiving, Prep, Pack, Returns),
matches platform/carrier fee line charges, evaluates SLA dispute windows, and produces financial claim recommendations.
"""

from shared.utils.agent_context import resolve_fee_lines
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, effective_verdict, previous
from orchestration.db import save_evidence_db, get_evidence_for_unit

STAGE = "recovery"
AGENT_ID = "recovery-agent@v1.0"
MODEL_INFO = {"name": "recovery-monotonic-classifier-v1", "version": "1.0", "provider": "recovery_engine", "calls": 1, "cost_usd": 0.001}


def position(line: dict, request: dict) -> tuple[str, str, list[str]]:
    """(CONTRADICTS | SUPPORTS | SILENT, detail, evidence record ids). Uses EFFECTIVE verdicts (overrides applied)."""
    ctype = line["charge_type"]
    subject_id = request["subject"].get("subject_id") or request["subject"].get("unit_id")
    org_id = request["subject"].get("org_id", "org_demo_alpha")

    def upstream(stage: str) -> dict | None:
        prior = previous(request, stage)
        if prior and prior.get("status") == "completed":
            return prior
        if not subject_id:
            return None
        rows = get_evidence_for_unit(subject_id, org_id)
        saved = next((row for row in reversed(rows) if row["stage"] == stage), None)
        if not saved:
            return None
        return {
            "record_id": saved.get("evidence_id") or saved.get("record_id"),
            "status": "completed",
            "decision": {"verdict": saved.get("verdict", "UNCERTAIN")},
            "payload": saved.get("payload") or {},
            "checks": [],
        }

    if ctype == "inbound_defect_fee":
        prep = upstream("prep")
        if prep:
            v = effective_verdict(request, prep)
            if v == "PASS":
                return "CONTRADICTS", "Prep evidence shows the unit compliant", [prep["record_id"]]
            if v == "FAIL":
                return "SUPPORTS", "Prep evidence shows a defect", [prep["record_id"]]
            return "SILENT", "Prep evidence is uncertain", [prep["record_id"]]
        return "SILENT", "no usable Prep record for this subject", []

    if ctype == "refund_issued_item_not_returned":
        ret = upstream("returns")
        if ret:
            rec_id = ret["record_id"]
            identity_check = next(
                (item for item in ret.get("checks", []) if item.get("check_key") == "identity_match"),
                None,
            )
            v = identity_check.get("verdict") if identity_check else ret["decision"]["verdict"]
            if v == "PASS":
                return "CONTRADICTS", "Returns record shows the right item came back", [rec_id]
            return "SILENT", "no usable Returns record", []
        return "SILENT", "no usable Returns record", []

    if ctype in {"misship_refund", "wrong_item_shipped", "outbound_misship"}:
        pack = upstream("pack")
        if not pack:
            return "SILENT", "no usable Pack record for this charge", []
        verdict = effective_verdict(request, pack)
        if verdict == "PASS":
            return "CONTRADICTS", "Pack evidence records the expected order contents before sealing", [pack["record_id"]]
        if verdict == "FAIL":
            return "SUPPORTS", "Pack evidence records an outbound order mismatch", [pack["record_id"]]
        return "SILENT", "Pack evidence is uncertain", [pack["record_id"]]

    if ctype == "fulfilment_fee_weight_tier":
        return "SILENT", "no measured weight/dimensions upstream (finding F-07)", []
    if ctype == "lost_inbound":
        receiving = upstream("receiving")
        if not receiving:
            return "SILENT", "no usable Receiving record for this charge", []
        verdict = effective_verdict(request, receiving)
        if verdict == "PASS":
            return "CONTRADICTS", "Receiving evidence confirms the expected quantity arrived", [receiving["record_id"]]
        if verdict == "FAIL":
            return "SUPPORTS", "Receiving evidence records a shortage or other discrepancy at handoff", [receiving["record_id"]]
        return "SILENT", "Receiving evidence is uncertain", [receiving["record_id"]]
    return "SILENT", f"no rule for {ctype}", []


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    lines = resolve_fee_lines(request)
    input_records = captures(request, {})
    user_inputs = (request.get("context") or {}).get("user_inputs", {})
    parse_errors = user_inputs.get("fee_report_parse_errors", [])
    prior_reimbursements = user_inputs.get("prior_reimbursements") or []
    if isinstance(prior_reimbursements, str):
        prior_reimbursements = prior_reimbursements.replace(",", "\n").splitlines()
    reimbursed_ids = {str(item).strip().casefold() for item in prior_reimbursements if str(item).strip()}

    checks, charges = [], []
    claimable_usd = 0.0
    seen_line_ids: set[str] = set()

    for line_index, line in enumerate(lines, start=1):
        normalized_line_id = str(line["line_id"]).strip().casefold()
        if normalized_line_id in seen_line_ids:
            pos, why, ids = "SILENT", "duplicate charge line in the uploaded report; duplicate claims are suppressed", []
        elif line.get("already_reimbursed") or normalized_line_id in reimbursed_ids:
            pos, why, ids = "SILENT", "charge is marked as already reimbursed; no claim will be assembled", []
        else:
            pos, why, ids = position(line, request)
        seen_line_ids.add(normalized_line_id)
        amount = float(line["amount_usd"])
        if pos == "CONTRADICTS" and amount <= 0:
            pos, why = "SILENT", "amount is 0.00: nothing to claim, or the amount is missing"

        verdict = {"CONTRADICTS": "FAIL", "SUPPORTS": "PASS", "SILENT": "UNCERTAIN"}[pos]
        checks.append(check(
            f"charge_{line['line_id'].lower().replace('-', '_')}_{line_index}",
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
            "duplicate": normalized_line_id in seen_line_ids and why.startswith("duplicate"),
            "already_reimbursed": bool(line.get("already_reimbursed") or normalized_line_id in reimbursed_ids),
        })

    for index, error in enumerate(parse_errors, start=1):
        checks.append(check(
            f"report_row_{index}_parse_error", "UNCERTAIN", None,
            expected="valid charge row for this unit",
            observed=error,
            detail=f"Fee report row could not be assessed: {error.get('reason', 'invalid row')}",
            evidence_refs=[item["ref"] for item in input_records],
            uncertain_reason="insufficient_evidence",
        ))

    claim = any(c["position"] == "CONTRADICTS" for c in charges)
    silent = any(c["position"] == "SILENT" for c in charges)
    verdict = "FAIL" if claim else ("UNCERTAIN" if silent or parse_errors else "PASS")
    outcome = "claim_recommended" if claim else (
        "report_parse_errors" if parse_errors else "insufficient_evidence" if silent else "no_claim")

    record = build_record(
        request, agent_id=AGENT_ID, record_id=f"RCY-{subject_id}",
        captured_at=utcnow(),
        checks=checks, outcome=outcome, verdict=verdict, needs_human=False, model=MODEL_INFO,
        inputs=input_records,
        reason=f"Recovery audit complete: {len(charges)} charge(s), {sum(c['position'] == 'CONTRADICTS' for c in charges)} contradicted, {len(parse_errors)} parse error(s)",
        payload={"charges": charges, "claimable_usd": round(claimable_usd, 2),
                 "unclaimable": [c for c in charges if c["position"] != "CONTRADICTS"],
                 "parse_errors": parse_errors, "vision_mode": "Cross-Stage Rules Engine"},
    )

    save_evidence_db(record)

    return build_output(record, next_step="complete")


app = make_app(STAGE, handle)
