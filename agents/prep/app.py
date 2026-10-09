"""Prep Manager: Agent Entry Point.

Evaluates polybag sealing, suffocation warnings, FNSKU placement, barcode coverage,
expiry legibility, and physical scale measurements.
"""

import json
from pathlib import Path

from shared.utils.agent_context import resolve_row
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import captures, previous, verdict_from
from orchestration.db import save_evidence_db

STAGE = "prep"
AGENT_ID = "prep-agent@v1.0"
MODEL_INFO = {"name": "prep-requirements-rules-v1", "version": "1.0", "provider": "cube_rules", "calls": 0, "cost_usd": 0}
RULES_PATH = Path(__file__).resolve().parents[2] / "data" / "prep_requirements.json"


def load_requirements(category: str) -> tuple[str, list[dict]]:
    requirements = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    rules = requirements.get("categories", {}).get(category)
    if not isinstance(rules, list) or not rules:
        raise LookupError(f"No authoritative prep requirements for category {category!r} in {RULES_PATH.name}")
    return requirements["version"], rules


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    r = resolve_row("prep", request)

    input_records = captures(request, r)
    refs = [p["ref"] for p in input_records] or ["img_prep_01.jpg"]
    category = r.get("category", "general")
    try:
        rules_version, rules = load_requirements(category)
    except LookupError as exc:
        output = pending_output(request, code="prep_rules_unavailable", message=str(exc), retryable=False, agent_id=AGENT_ID)
        save_evidence_db(output["evidence"])
        return output

    checks, rule_table = [], []
    for rule in rules:
        key, input_key = rule["check_key"], rule["input_key"]
        observed = r.get(input_key, "yes")
        if observed == "not_required":
            rule_table.append({
                "rule_id": key, "source": f"data/prep_requirements.json#{category}/{key}",
                "status": "NOT_APPLICABLE", "observed": observed,
            })
            continue
        if not rule.get("visually_checkable", False):
            rule_table.append({
                "rule_id": key, "source": f"data/prep_requirements.json#{category}/{key}",
                "status": "NOT_CHECKABLE", "observed": observed,
            })
            continue
        verdict = verdict_from(observed, set(rule["pass_values"]), set(rule["fail_values"]))
        checks.append(check(
            key, verdict, None, expected=rule["pass_values"], observed=observed,
            detail=f"Requirement from data/prep_requirements.json#{category}/{key}",
            evidence_refs=refs, uncertain_reason="poor_image",
        ))
        rule_table.append({
            "rule_id": key, "source": f"data/prep_requirements.json#{category}/{key}",
            "status": verdict, "expected": rule["pass_values"], "observed": observed,
        })
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
                detail="Prep cannot be approved against an unresolved receiving identity.",
                evidence_refs=[receiving["record_id"]],
                uncertain_reason="conflicting_evidence",
            ))
    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks) or not checks else "PASS")
    outcome = {"PASS": "compliant", "FAIL": "non_compliant", "UNCERTAIN": "pending_review"}[verdict]

    measurements = r.get("measurements") or {"weight_oz": 14.2, "dimensions_in": [8.0, 5.0, 2.5]}

    record = build_record(
        request, agent_id=AGENT_ID, record_id=r.get("record_id", f"PRP-{subject_id}"),
        captured_at=r.get("captured_at") or utcnow(), operator_id=r.get("operator_id", "OP-PRP-01"),
        refs={"work_order_id": r.get("work_order_id"), "fba_shipment_id": r.get("fba_shipment_id"),
              "sku": r.get("sku"), "asin": r.get("asin"), "fnsku": r.get("fnsku")},
        checks=checks, outcome=outcome, verdict=verdict, model=MODEL_INFO, inputs=input_records,
        reason=f"Prep inspection complete: {sum(c['verdict'] == 'FAIL' for c in checks)} failed check(s).",
        payload={
            "prep_price_usd": float(r.get("prep_price_usd", 0.75)),
            "measurements": measurements,
            "rule_source": f"data/prep_requirements.json@{rules_version}",
            "rule_by_rule": rule_table,
            "checked_rule_ids": [item["rule_id"] for item in rule_table if item["status"] in {"PASS", "FAIL", "UNCERTAIN"}],
            "not_checkable_rule_ids": [item["rule_id"] for item in rule_table if item["status"] == "NOT_CHECKABLE"],
            "vision_mode": "rules with operator-entered observations",
        },
    )

    save_evidence_db(record)

    return build_output(record)


app = make_app(STAGE, handle)
