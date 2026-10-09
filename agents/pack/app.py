"""Pack Manager: Agent Entry Point.

Performs automated outbound package contents verification, bounding box item detection,
expected order reconciliation, and operational decisions (SEAL / STOP_AND_FIX / MANUAL_REVIEW).
"""

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, previous
from orchestration.db import save_evidence_db

STAGE = "pack"
AGENT_ID = "pack-agent@v1.0"
MODEL_INFO = {"name": "pack-order-reconciliation-rules-v1", "version": "1.0", "provider": "cube_rules", "calls": 0, "cost_usd": 0}


def parse_lines(text: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for part in filter(None, (text or "").split(";")):
        sku, _, qty = part.partition(":")
        out[sku] = out.get(sku, 0) + int(qty or 1)
    return out


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("pack", request)

    input_records = captures(request, r)
    refs = [p["ref"] for p in input_records] or ["img_pack_01.jpg"]
    want, got = parse_lines(r.get("order_lines", "")), parse_lines(r.get("observed_in_box", ""))
    missing = sorted(k for k in want if k not in got)
    short = sorted(k for k in want if k in got and got[k] != want[k])
    extra = sorted(k for k in got if k not in want)

    checks = [
        check("items_present", "FAIL" if missing else "PASS", None, expected=sorted(want), observed=sorted(got),
              detail=f"missing: {missing}" if missing else "", evidence_refs=refs),
        check("quantities_correct", "FAIL" if short else "PASS", None, expected=want,
              observed={k: got[k] for k in want if k in got}, evidence_refs=refs),
        check("no_extra_items", "FAIL" if extra else "PASS", None, expected=[], observed=extra, evidence_refs=refs),
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
                detail="Pack cannot be sealed against an unresolved receiving identity.",
                evidence_refs=[receiving["record_id"]],
                uncertain_reason="conflicting_evidence",
            ))
    if str(r.get("look_alike", "false")).lower() in {"true", "yes", "1"}:
        checks.append(check(
            "item_identity", "UNCERTAIN", None,
            expected="order item identity confirmed", observed="look-alike or not confidently identified",
            evidence_refs=refs, uncertain_reason="conflicting_evidence",
        ))
    has_failure = any(c["verdict"] == "FAIL" for c in checks)
    has_uncertainty = any(c["verdict"] == "UNCERTAIN" for c in checks)
    pack_out = "stop_and_fix" if has_failure else "uncertain" if has_uncertainty else "seal"
    verdict = "FAIL" if has_failure else "UNCERTAIN" if has_uncertainty else "PASS"

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"PCK-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-PCK-01"),
        unit_scope="order", refs={"order_id": r.get("order_id")}, checks=checks, outcome=pack_out,
        verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Pack manager inspection: decision={pack_out.upper()}",
        payload={"channel": r.get("channel", "FBA"), "operator_verdict": r.get("operator_verdict", "review"),
                 "agent_agrees_with_operator": r.get("operator_verdict") == pack_out,
                 "vision_mode": "rules with operator-entered item observations"},
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
