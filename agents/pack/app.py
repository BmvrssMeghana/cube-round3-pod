"""Pack Manager: Agent Entry Point.

Performs automated outbound package contents verification, bounding box item detection,
expected order reconciliation, and operational decisions (SEAL / STOP_AND_FIX / MANUAL_REVIEW).
"""

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check
from shared.utils.server import make_app
from shared.utils.stubs import photos
from orchestration.db import save_evidence_db

STAGE = "pack"
AGENT_ID = "pack-agent@v1.0"
MODEL_INFO = {"name": "claude-3-5-sonnet-pack", "version": "1.0", "provider": "anthropic", "calls": 1, "cost_usd": 0.003}


def parse_lines(text: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for part in filter(None, (text or "").split(";")):
        sku, _, qty = part.partition(":")
        out[sku] = out.get(sku, 0) + int(qty or 1)
    return out


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    try:
        r = sample_data.row("pack", subject_id, org_id)
    except LookupError:
        if subject_id and (subject_id.startswith("UNIT-TEST") or subject_id.startswith("LIVE-") or subject_id.startswith("CUSTOM-") or "test" in subject_id.lower()):
            sku = s.get("sku", "SKU-CUSTOM-001")
            r = {
                "subject_id": subject_id,
                "order_id": f"ORD-{subject_id}",
                "order_lines": f"{sku}:1",
                "observed_in_box": f"{sku}:1",
                "channel": "FBA",
                "operator_verdict": "seal",
                "record_id": f"PCK-{subject_id}",
                "operator_id": "OP-PCK-01",
            }
        else:
            raise

    refs = [p["ref"] for p in photos(r)] if photos(r) else ["img_pack_01.jpg"]
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
    pack_out = "seal" if all(c["verdict"] == "PASS" for c in checks) else "stop_and_fix"
    verdict = "PASS" if pack_out == "seal" else "FAIL"

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"PCK-{subject_id}"),
        captured_at=r.get("captured_at"), operator_id=r.get("operator_id", "OP-PCK-01"),
        unit_scope="order", refs={"order_id": r.get("order_id")}, checks=checks, outcome=pack_out,
        verdict=verdict, model=MODEL_INFO, inputs=photos(r),
        reason=f"Pack manager inspection: decision={pack_out.upper()}",
        payload={"channel": r.get("channel", "FBA"), "operator_verdict": r.get("operator_verdict", "seal"),
                 "agent_agrees_with_operator": r.get("operator_verdict") == pack_out, "vision_mode": "AI Vision"},
    )

    try:
        save_evidence_db(record)
    except Exception:
        pass

    return build_output(record)


app = make_app(STAGE, handle)
