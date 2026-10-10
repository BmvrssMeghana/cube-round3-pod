"""Idempotently import the supplied sample CSV evidence into the configured SQL database."""

from __future__ import annotations

import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from orchestration.db import (
    ensure_organization,
    get_connection,
    init_db,
    save_unit_db,
    is_postgres_connection,
)
from orchestration.orchestrator import default_flow_path, load_flow, new_workflow, run_workflow
from orchestration.store import DatabaseStore


SAMPLE_DIR = Path(os.environ.get("DATA_DIR", ROOT / "data" / "sample"))
CSV_SOURCES = {
    "receiving": "receiving_sample.csv",
    "prep": "prep_sample.csv",
    "pack": "pack_sample.csv",
    "returns": "returns_sample.csv",
    "fees": "fee_report_sample.csv",
}
STAGES_PREFIX = {"receiving": "RCV", "prep": "PRP", "pack": "PCK", "returns": "RTN", "recovery": "RCY"}


def _load_csv(source: str, filename: str) -> list[dict[str, str]]:
    path = SAMPLE_DIR / filename
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def _timestamp(row: dict[str, str], record_type: str) -> str | None:
    value = row.get("captured_at") or row.get("posted_date")
    if not value:
        return None
    if len(value) == 10:
        return f"{value}T00:00:00+00:00"
    return value.replace("Z", "+00:00")


def _source_timestamp(source_records: list[tuple[str, str, str, dict[str, str]]]) -> str:
    timestamps = [
        parsed
        for _, record_type, _, row in source_records
        if (value := _timestamp(row, record_type))
        and (parsed := datetime.fromisoformat(value))
    ]
    return min(timestamps).isoformat() if timestamps else datetime.now(timezone.utc).isoformat()


def _number(value: str | None, default: int = 1) -> int:
    try:
        parsed = int(value or "")
        return parsed if parsed > 0 else default
    except ValueError:
        return default


def _unit_context(
    org_id: str,
    unit_id: str,
    records: list[tuple[str, str, str, dict[str, str]]],
    case_index: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    by_type: dict[str, list[dict[str, str]]] = defaultdict(list)
    for _, record_type, _, row in records:
        by_type[record_type].append(row)

    receiving = by_type["receiving"][0] if by_type["receiving"] else {}
    prep = by_type["prep"][0] if by_type["prep"] else {}
    pack = by_type["pack"][0] if by_type["pack"] else {}
    returns = by_type["returns"][0] if by_type["returns"] else {}
    fees = by_type["fees"]
    case = case_index.get((org_id, unit_id), {})
    route = "fba" if prep else "mfn" if pack else str(case.get("route") or "unknown").lower()
    returned = bool(returns) or bool(case.get("returned", False))
    sku = (
        receiving.get("sku") or prep.get("sku") or pack.get("order_lines", "").split(":")[0]
        or returns.get("ordered_sku") or (fees[0].get("sku") if fees else None) or "UNKNOWN"
    )
    fee_lines = [
        {
            **row,
            "amount_usd": float(row.get("amount_usd") or 0),
            "quantity": _number(row.get("quantity")),
            "already_reimbursed": str(row.get("already_reimbursed", "")).strip().lower()
            in {"1", "true", "yes", "y"},
        }
        for row in fees
    ]
    attrs = {
        "stage_records": {
            record_type: by_type[record_type][0]
            for record_type in ("receiving", "prep", "pack", "returns")
            if by_type[record_type]
        },
        "source_records": {
            record_type: [row for _, kind, _, row in records if kind == record_type]
            for record_type in CSV_SOURCES
            if any(kind == record_type for _, kind, _, _ in records)
        },
        "fee_lines": fee_lines,
    }
    return {
        "org_id": org_id,
        "unit_id": unit_id,
        "route": route,
        "returned": returned,
        "sku": sku,
        "expected_qty": _number(receiving.get("qty_ordered")),
        "expected_cartons": _number(receiving.get("cartons_ordered")),
        "variant": receiving.get("spec_variant"),
        "fnsku": receiving.get("fnsku") or prep.get("fnsku"),
        "order_id": pack.get("order_id") or returns.get("order_id") or (fees[0].get("order_id") if fees else None),
        "po_number": receiving.get("po_number"),
        "asin": receiving.get("asin") or prep.get("asin"),
        "fee_lines": fee_lines,
        "attributes": attrs,
    }


def import_data() -> dict[str, Any]:
    init_db()
    case_path = SAMPLE_DIR / "cases.json"
    cases = json.loads(case_path.read_text(encoding="utf-8"))
    case_index = {(row["org_id"], row["unit_id"]): row for row in cases}
    source_records: list[tuple[str, str, str, dict[str, str]]] = []
    by_unit: dict[tuple[str, str], list[tuple[str, str, str, dict[str, str]]]] = defaultdict(list)
    source_counts: dict[str, int] = {}

    for record_type, filename in CSV_SOURCES.items():
        rows = _load_csv(record_type, filename)
        source_counts[filename] = len(rows)
        for row in rows:
            org_id, unit_id = row["org_id"], row["unit_id"]
            record_id = row.get("record_id") or row.get("line_id")
            if not record_id:
                raise ValueError(f"{filename} contains a row without record_id/line_id")
            item = (filename, record_type, record_id, row)
            source_records.append(item)
            by_unit[(org_id, unit_id)].append(item)

    store = DatabaseStore()
    flow = load_flow(default_flow_path())
    for (org_id, unit_id), records in by_unit.items():
        case = _unit_context(org_id, unit_id, records, case_index)
        timestamp = _source_timestamp(records)
        ensure_organization(org_id, org_id)
        save_unit_db(
            unit_id=unit_id,
            org_id=org_id,
            sku=case["sku"],
            expected_quantity=case["expected_qty"],
            variant=case["variant"],
            fnsku=case["fnsku"],
            order_id=case["order_id"],
            channel=case["route"],
            is_returned=case["returned"],
            attributes=case["attributes"],
            created_at=timestamp,
        )

        workflow = new_workflow(case, flow)
        stage_recs = case["attributes"]["stage_records"]
        fee_lines = case["attributes"]["fee_lines"]

        # Populate stage results based on imported CSV data
        completed_stages = 0
        for sr in workflow["stage_results"]:
            st = sr["stage"]
            if st == "recovery" and not fee_lines:
                sr["state"] = "pending"
                sr["skipped_reason"] = None
                continue
            if st in stage_recs or (st == "recovery" and fee_lines):
                rec_data = stage_recs.get(st) or (fee_lines[0] if fee_lines else {})
                record_id = rec_data.get("record_id") or rec_data.get("line_id") or f"{STAGES_PREFIX.get(st, 'EV')}-{unit_id}"

                # Determine verdict from CSV signals
                verdict = "PASS"
                if st == "receiving":
                    qty_rcv = _number(rec_data.get("qty_received"), case["expected_qty"])
                    qty_ord = _number(rec_data.get("qty_ordered"), case["expected_qty"])
                    if qty_rcv < qty_ord: verdict = "FAIL"
                elif st == "prep":
                    if rec_data.get("prep_required") == "yes" and rec_data.get("prep_completed") != "yes":
                        verdict = "FAIL"
                elif st == "returns":
                    if rec_data.get("disposition") in ("DAMAGED", "UNSELLABLE"):
                        verdict = "UNCERTAIN"
                elif st == "recovery":
                    if any(f.get("amount_usd", 0) > 0 and not f.get("already_reimbursed") for f in fee_lines):
                        verdict = "PASS"

                sr["state"] = "completed"
                sr["verdict"] = verdict
                sr["record_id"] = record_id
                sr["evidence_status"] = "completed"
                sr["finished_at"] = timestamp
                if record_id not in workflow["evidence_references"]:
                    workflow["evidence_references"].append(record_id)
                completed_stages += 1

                # Save evidence record into database
                ev_record = {
                    "schema_version": "1.0.0",
                    "record_id": record_id,
                    "evidence_id": record_id,
                    "workflow_id": workflow["workflow_id"],
                    "subject": {"subject_id": unit_id},
                    "subject_id": unit_id,
                    "stage": st,
                    "agent_id": st,
                    "status": "completed",
                    "org_id": org_id,
                    "captured_at": timestamp,
                    "produced_at": timestamp,
                    "created_at": timestamp,
                    "model": {"name": "CUBE-CSV-Engine", "version": "v3.0"},
                    "checks": [],
                    "decision": {
                        "verdict": verdict,
                        "outcome": "completed",
                        "reason": f"Imported from {st} CSV record {record_id}",
                        "needs_human": verdict in ("FAIL", "UNCERTAIN"),
                    },
                    "payload": rec_data,
                    "upstream_refs": workflow["evidence_references"][:-1],
                }
                store.put_evidence(ev_record)

        if completed_stages > 0:
            workflow["status"] = "COMPLETED" if all(s["state"] in ("completed", "skipped") for s in workflow["stage_results"]) else "IN_PROGRESS"

        workflow["current_stage"] = next(
            (
                stage["stage"]
                for stage in workflow["stage_results"]
                if stage["state"] in ("error", "pending")
            ),
            None,
        ) or next(
            (
                stage["stage"]
                for stage in reversed(workflow["stage_results"])
                if stage["state"] == "completed"
            ),
            None,
        )
        workflow["timestamps"]["created_at"] = timestamp
        workflow["timestamps"]["updated_at"] = timestamp
        workflow["context"]["source_data_imported"] = True
        store.save_workflow(workflow)

    conn = get_connection()
    is_pg = is_postgres_connection(conn)
    imported_at = datetime.now(timezone.utc).isoformat()
    try:
        with conn:
            cursor = conn.cursor()
            for filename, record_type, record_id, row in source_records:
                captured_at = _timestamp(row, record_type)
                data_json = json.dumps(row)
                cursor.execute(
                    """
                    INSERT INTO source_records (
                        org_id, record_type, record_id, unit_id, source_file,
                        record_data, captured_at, imported_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                    ON CONFLICT (org_id, record_type, record_id) DO UPDATE SET
                        unit_id=EXCLUDED.unit_id, source_file=EXCLUDED.source_file,
                        record_data=EXCLUDED.record_data, captured_at=EXCLUDED.captured_at,
                        imported_at=EXCLUDED.imported_at
                    """ if is_pg else """
                    INSERT INTO source_records (
                        org_id, record_type, record_id, unit_id, source_file,
                        record_data, captured_at, imported_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (org_id, record_type, record_id) DO UPDATE SET
                        unit_id=excluded.unit_id, source_file=excluded.source_file,
                        record_data=excluded.record_data, captured_at=excluded.captured_at,
                        imported_at=excluded.imported_at
                    """,
                    (row["org_id"], record_type, record_id, row["unit_id"], filename, data_json, captured_at, imported_at),
                )
    finally:
        conn.close()

    return {
        "database": "PostgreSQL" if is_pg else "SQLite",
        "source_rows": source_counts,
        "total_source_rows": len(source_records),
        "units": len(by_unit),
        "workflows": len(by_unit),
        "organizations": len({org_id for org_id, _ in by_unit}),
    }


if __name__ == "__main__":
    print(json.dumps(import_data(), indent=2))
