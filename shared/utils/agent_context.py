"""Resolve per-stage agent input rows from the orchestrator context or PostgreSQL (no CSV in production)."""
from __future__ import annotations

import os
import csv
import io
from typing import Any

from shared.utils import sample_data


def use_sample_data() -> bool:
    return os.environ.get("USE_SAMPLE_DATA", "0").lower() in ("1", "true", "yes")


def case_from_request(request: dict) -> dict | None:
    case = (request.get("context") or {}).get("case")
    if isinstance(case, dict) and case.get("unit_id"):
        return case
    return None


def _apply_live_inputs(stage: str, row: dict[str, Any], request: dict) -> dict[str, Any]:
    """Overlay UI / inspect payload onto the database-backed baseline row."""
    s = request.get("subject") or {}
    user = (request.get("context") or {}).get("user_inputs") or {}
    merged = {**user, **{k: v for k, v in s.items() if k not in ("org_id", "subject_id", "unit_id", "route") and v is not None}}
    if not merged:
        return row
    out = {**row}
    if merged.get("record_id"):
        out["record_id"] = merged["record_id"]
    if merged.get("operator_label"):
        out["operator_id"] = merged["operator_label"]
    if merged.get("captured_at"):
        out["captured_at"] = merged["captured_at"]
    if stage == "receiving":
        aliases = {
            "expected_qty": "qty_ordered",
            "observed_qty": "qty_received",
            "damage": "carton_damage",
            "sku_match": None,
        }
        for src, dst in aliases.items():
            if src in merged and dst:
                out[dst] = merged[src]
        for key in (
            "sku", "qty_ordered", "qty_received", "cartons_ordered", "cartons_received",
            "identity_match", "carton_damage", "unit_damage", "quality_flags", "operator_id",
            "product_title", "po_number", "po_line", "asin", "expected_variant",
            "observed_variant", "units_per_carton_ordered", "units_per_carton_counted",
            "operator_label", "cartons_ordered", "cartons_received",
        ):
            if key in merged:
                out[key] = merged[key]
        if merged.get("sku_match") is False:
            out["identity_match"] = "no"
        elif merged.get("sku_match") is True:
            out["identity_match"] = "yes"
    elif stage == "prep":
        for key in (
            "polybag_present_sealed", "suffocation_warning", "fnsku_label_placement",
            "original_barcode_covered", "expiry_date", "handling_marks", "fnsku", "work_order_id",
            "category", "measurements", "operator_label",
        ):
            if key in merged:
                out[key] = merged[key]
    elif stage == "pack":
        for key in ("order_lines", "observed_in_box", "order_id", "operator_verdict", "channel",
                    "look_alike", "operator_label"):
            if key in merged:
                out[key] = merged[key]
    elif stage == "returns":
        for key in (
            "identity_match", "parts_list", "parts_missing", "observed_state",
            "disposition", "operator_disposition", "ordered_sku", "ordered_asin",
            "returned_sku", "operator_label",
        ):
            if key in merged:
                out[key] = merged[key]
    return out


def resolve_row(stage: str, request: dict) -> dict[str, Any]:
    """Return the stage-specific row from the case or database profile."""
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")

    if use_sample_data():
        if stage == "recovery":
            row: dict[str, Any] = {"subject_id": subject_id, "record_id": f"RCY-{subject_id}"}
        else:
            row = sample_data.row(stage, subject_id, org_id)
        return _apply_live_inputs(stage, row, request)

    case = case_from_request(request)
    if case is not None:
        stage_record = (case.get("stage_records") or {}).get(stage, {})
        stage_case = {**case, **stage_record}
        return _apply_live_inputs(stage, _row_from_case(stage, stage_case, s), request)

    from orchestration.db import get_unit_profile

    profile = get_unit_profile(org_id, subject_id)
    if profile is None:
        raise LookupError(f"no unit profile for org={org_id} unit={subject_id}")
    return _apply_live_inputs(stage, _row_from_profile(stage, profile, s), request)


def resolve_fee_lines(request: dict) -> list[dict]:
    s = request["subject"]
    subject_id = s.get("subject_id") or s.get("unit_id")
    org_id = s.get("org_id", "org_demo_alpha")
    user = (request.get("context") or {}).get("user_inputs") or {}

    report_csv = user.get("fee_report_csv")
    if isinstance(report_csv, str) and report_csv.strip():
        lines = []
        parse_errors = []
        try:
            reader = csv.DictReader(io.StringIO(report_csv))
            required = {"line_id", "unit_id", "charge_type", "amount_usd"}
            if not reader.fieldnames or not required.issubset(reader.fieldnames):
                raise ValueError(f"CSV header must include {', '.join(sorted(required))}")
            for row_number, row in enumerate(reader, start=2):
                if row.get("unit_id") != subject_id or row.get("org_id", org_id) != org_id:
                    continue
                try:
                    amount = float(row["amount_usd"])
                    if amount < 0:
                        raise ValueError("amount_usd cannot be negative")
                    if not row.get("charge_type"):
                        raise ValueError("charge_type is required")
                    lines.append({
                        "line_id": row["line_id"] or f"CSV-{row_number}",
                        "charge_type": row["charge_type"],
                        "amount_usd": amount,
                        "posted_date": row.get("posted_date") or "1970-01-01",
                        "already_reimbursed": str(row.get("already_reimbursed", "")).strip().lower()
                        in {"1", "true", "yes", "y"},
                    })
                except (TypeError, ValueError) as exc:
                    parse_errors.append({"row": row_number, "reason": str(exc)})
        except (csv.Error, ValueError) as exc:
            parse_errors.append({"row": 1, "reason": str(exc)})
        if not lines and not parse_errors:
            parse_errors.append({
                "row": None,
                "reason": f"no valid charge rows found for org={org_id}, unit={subject_id}",
            })
        user["fee_report_parse_errors"] = parse_errors
        return lines

    def _single_charge() -> list[dict] | None:
        ctype = user.get("charge_type") or s.get("charge_type")
        if not ctype:
            return None
        return [{
            "line_id": user.get("line_id") or s.get("line_id", f"LINE-{subject_id}-01"),
            "charge_type": ctype,
            "amount_usd": float(user.get("amount_usd", s.get("amount_usd", s.get("charge_amount", 0)))),
            "posted_date": user.get("posted_date", s.get("posted_date", "2026-01-01")),
        }]

    fl = user.get("fee_lines") or s.get("fee_lines")
    if fl and isinstance(fl, list) and fl:
        return fl
    one = _single_charge()
    if one:
        return one

    if use_sample_data():
        return sample_data.fee_lines(subject_id, org_id)

    if s.get("fee_lines"):
        return s["fee_lines"] if isinstance(s["fee_lines"], list) else []

    case = case_from_request(request)
    if case and case.get("fee_lines"):
        fl = case["fee_lines"]
        return fl if isinstance(fl, list) else []

    from orchestration.db import get_unit_profile

    profile = get_unit_profile(org_id, subject_id)
    if profile and profile.get("attributes", {}).get("fee_lines"):
        fl = profile["attributes"]["fee_lines"]
        return fl if isinstance(fl, list) else []

    one = _single_charge()
    if one:
        return one

    raise LookupError(f"no fee lines for org={org_id} unit={subject_id}")


def _row_from_case(stage: str, case: dict, subject: dict) -> dict[str, Any]:
    uid = case["unit_id"]
    sku = case.get("sku") or subject.get("sku", "UNKNOWN")
    base = {"subject_id": uid, "sku": sku, "record_id": f"{stage[:3].upper()}-{uid}", "operator_id": subject.get("operator_id", "OP-01")}
    if stage == "receiving":
        return {
            **base,
            "product_title": case.get("product_title", sku),
            "po_number": case.get("po_number", f"PO-{uid}"),
            "po_line": case.get("po_line", "LINE-01"),
            "asin": case.get("asin", subject.get("asin", "")),
            "qty_ordered": case.get("expected_qty", subject.get("expected_quantity", 1)),
            "qty_received": case.get("qty_received", subject.get("observed_quantity", case.get("expected_qty", 1))),
            "cartons_ordered": case.get("expected_cartons", 1),
            "cartons_received": case.get("cartons_received", case.get("expected_cartons", 1)),
            "identity_match": case.get("identity_match", subject.get("identity_match", "yes")),
            "carton_damage": case.get("carton_damage", subject.get("carton_damage", "none")),
            "unit_damage": case.get("unit_damage", subject.get("unit_damage", "none")),
            "expected_variant": case.get("expected_variant", case.get("variant")),
            "observed_variant": case.get("observed_variant"),
            "quality_flags": case.get("quality_flags", subject.get("quality_flags", "")),
        }
    if stage == "prep":
        return {
            **base,
            "work_order_id": case.get("work_order_id", f"WO-{uid}"),
            "fba_shipment_id": case.get("fba_shipment_id", f"FBA-{uid}"),
            "fnsku": case.get("fnsku", subject.get("fnsku", "")),
            "polybag_present_sealed": subject.get("polybag_present_sealed", case.get("polybag_present_sealed", "yes")),
            "suffocation_warning": subject.get("suffocation_warning", case.get("suffocation_warning", "legible")),
            "fnsku_label_placement": subject.get("fnsku_label_placement", case.get("fnsku_label_placement", "flat")),
            "original_barcode_covered": subject.get("original_barcode_covered", case.get("original_barcode_covered", "yes")),
            "expiry_date": subject.get("expiry_date", case.get("expiry_date", "legible")),
            "handling_marks": subject.get("handling_marks", case.get("handling_marks", "all_present")),
        }
    if stage == "pack":
        lines = subject.get("order_lines") or case.get("order_lines") or f"{sku}:1"
        observed = subject.get("observed_in_box") or case.get("observed_in_box") or lines
        return {
            **base,
            "order_id": case.get("order_id", f"ORD-{uid}"),
            "order_lines": lines,
            "observed_in_box": observed,
            "channel": case.get("route", subject.get("route", "fba")).upper(),
            "operator_verdict": subject.get("operator_verdict", case.get("operator_verdict", "seal")),
        }
    if stage == "returns":
        return {
            **base,
            "order_id": case.get("order_id", f"ORD-{uid}"),
            "ordered_sku": sku,
            "ordered_asin": case.get("asin", subject.get("asin", "")),
            "identity_match": subject.get("identity_match", case.get("identity_match", "yes")),
            "parts_list": subject.get("parts_list", case.get("parts_list", "unit")),
            "parts_missing": subject.get("parts_missing", case.get("parts_missing", "")),
            "observed_state": subject.get("observed_state", case.get("observed_state", "factory_sealed")),
            "operator_disposition": subject.get("disposition", case.get("operator_disposition", "restock")),
        }
    if stage == "recovery":
        return {**base, "fee_lines": subject.get("fee_lines") or case.get("fee_lines", "")}
    raise LookupError(f"unknown stage {stage}")


def _row_from_profile(stage: str, profile: dict, subject: dict) -> dict[str, Any]:
    attrs = profile.get("attributes") or {}
    stage_record = (attrs.get("stage_records") or {}).get(stage, {})
    merged = {**attrs, **stage_record, **{k: v for k, v in subject.items() if v is not None}}
    case = {
        "org_id": profile["org_id"],
        "unit_id": profile["unit_id"],
        "route": profile.get("channel", "fba"),
        "returned": profile.get("is_returned", False),
        "sku": profile.get("sku"),
        **merged,
    }
    return _row_from_case(stage, case, subject)
