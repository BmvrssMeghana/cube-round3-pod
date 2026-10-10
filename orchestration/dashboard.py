"""Server-side dashboard aggregations for CUBE Command Center and agent dashboards."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import psycopg2

from orchestration.db import get_connection


def _is_pg(conn) -> bool:
    return isinstance(conn, psycopg2.extensions.connection)

STAGES = ("receiving", "prep", "pack", "returns", "recovery")
VERDICTS = ("PASS", "FAIL", "UNCERTAIN")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            if value.endswith("Z"):
                value = value[:-1] + "+00:00"
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def _sort_timestamp(value: Any) -> str:
    parsed = _parse_ts(value)
    if parsed is None:
        return ""
    return parsed.astimezone(timezone.utc).isoformat()


def resolve_date_range(
    range_key: str = "30d",
    custom_start: Optional[str] = None,
    custom_end: Optional[str] = None,
) -> Tuple[datetime, datetime, Optional[datetime], Optional[datetime]]:
    """Return (start, end, prev_start, prev_end) for trend comparison."""
    end = _utcnow()
    key = (range_key or "30d").lower()
    if key == "all":
        start = datetime(1970, 1, 1, tzinfo=timezone.utc)
        return start, end, None, None
    if key == "custom" and custom_start and custom_end:
        start = _parse_ts(custom_start) or (end - timedelta(days=30))
        end = _parse_ts(custom_end) or end
    elif key == "today":
        start = end.replace(hour=0, minute=0, second=0, microsecond=0)
    elif key == "7d":
        start = end - timedelta(days=7)
    elif key == "90d":
        start = end - timedelta(days=90)
    else:
        start = end - timedelta(days=30)

    duration = end - start
    prev_end = start
    prev_start = start - duration
    return start, end, prev_start, prev_end


def _in_range(ts: Optional[datetime], start: datetime, end: datetime) -> bool:
    if ts is None:
        return False
    return start <= ts <= end


def _row_dict(row, is_pg: bool, keys: List[str]) -> dict:
    if hasattr(row, "keys"):
        return dict(row)
    return dict(zip(keys, row))


def _query_evidence(org_id: str, start: datetime, end: datetime, stage: Optional[str] = None) -> List[dict]:
    conn = get_connection()
    is_pg = _is_pg(conn)
    records: List[dict] = []
    keys = [
        "evidence_id", "workflow_id", "unit_id", "stage", "verdict", "confidence",
        "reason", "model_name", "model_version", "vision_mode", "metadata_json", "evidence_data", "created_at",
    ]
    stage_clause = ""
    params: list = [org_id, start.isoformat(), end.isoformat()]
    if stage:
        stage_clause = " AND e.stage = ?" if not is_pg else " AND e.stage = %s"
        params.append(stage)
    sql = f"""
        SELECT e.evidence_id, e.workflow_id, e.unit_id, e.stage, e.verdict, e.confidence,
               e.reason, e.model_name, e.model_version, e.vision_mode, e.metadata_json, e.evidence_data, e.created_at
        FROM evidence_records e
        JOIN workflows w ON w.workflow_id = e.workflow_id
        WHERE w.org_id = {'?' if not is_pg else '%s'}
          AND e.created_at >= {'?' if not is_pg else '%s'}
          AND e.created_at <= {'?' if not is_pg else '%s'}
        {stage_clause}
        ORDER BY e.created_at DESC
    """
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(sql, tuple(params))
            for row in cur.fetchall():
                rec = _row_dict(row, is_pg, keys)
                for source, target in (("metadata_json", "payload"), ("evidence_data", "evidence")):
                    value = rec.get(source)
                    if isinstance(value, str):
                        try:
                            rec[target] = json.loads(value)
                        except json.JSONDecodeError:
                            rec[target] = {}
                    else:
                        rec[target] = value or {}
                records.append(rec)
    finally:
        conn.close()
    return records


def _count_units(org_id: str) -> int:
    conn = get_connection()
    is_pg = _is_pg(conn)
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"SELECT COUNT(DISTINCT unit_id) FROM units WHERE org_id = {'?' if not is_pg else '%s'}",
                (org_id,),
            )
            row = cur.fetchone()
            return int(row[0]) if row else 0
    finally:
        conn.close()


def _human_reviews(org_id: str, pending_only: bool = False) -> List[dict]:
    conn = get_connection()
    is_pg = _is_pg(conn)
    keys = ["review_id", "exception_id", "workflow_id", "stage", "old_verdict", "new_verdict", "reason", "actor", "status", "timestamp"]
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT r.review_id, r.exception_id, r.workflow_id, r.stage, r.old_verdict, r.new_verdict,
                           r.reason, r.actor, r.status, r.timestamp
                    FROM human_reviews r
                    JOIN workflows w ON w.workflow_id = r.workflow_id
                    WHERE w.org_id = {'?' if not is_pg else '%s'}
                    ORDER BY r.timestamp DESC""",
                (org_id,),
            )
            rows = [_row_dict(r, is_pg, keys) for r in cur.fetchall()]
    finally:
        conn.close()
    if pending_only:
        return [r for r in rows if (r.get("status") or "").upper() not in ("RESOLVED", "CLOSED")]
    return rows


def _recovery_totals(org_id: str, start: datetime, end: datetime) -> dict:
    conn = get_connection()
    is_pg = _is_pg(conn)
    out = {
        "charges_evaluated": 0,
        "total_charge_amount": 0.0,
        "potential_recoverable": 0.0,
        "confirmed_recovered": 0.0,
        "eligible_count": 0,
    }
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT COUNT(*), COALESCE(SUM(c.amount), 0)
                    FROM charges c
                    JOIN units u ON u.unit_id = c.unit_id AND u.org_id = {'?' if not is_pg else '%s'}
                    WHERE c.created_at >= {'?' if not is_pg else '%s'} AND c.created_at <= {'?' if not is_pg else '%s'}""",
                (org_id, start.isoformat(), end.isoformat()),
            )
            row = cur.fetchone()
            if row:
                out["charges_evaluated"] = int(row[0] or 0)
                out["total_charge_amount"] = float(row[1] or 0)

            cur.execute(
                f"""SELECT COUNT(*), COALESCE(SUM(rc.claim_amount), 0)
                    FROM recovery_claims rc
                    JOIN units u ON u.unit_id = rc.unit_id AND u.org_id = {'?' if not is_pg else '%s'}
                    WHERE rc.claim_recommended = 'yes'
                      AND rc.created_at >= {'?' if not is_pg else '%s'} AND rc.created_at <= {'?' if not is_pg else '%s'}""",
                (org_id, start.isoformat(), end.isoformat()),
            )
            row = cur.fetchone()
            if row:
                out["eligible_count"] = int(row[0] or 0)
                out["potential_recoverable"] = float(row[1] or 0)

            cur.execute(
                f"""SELECT COALESCE(SUM(rc.claim_amount), 0)
                    FROM recovery_claims rc
                    JOIN units u ON u.unit_id = rc.unit_id AND u.org_id = {'?' if not is_pg else '%s'}
                    WHERE rc.position = 'CONFIRMED'
                      AND rc.created_at >= {'?' if not is_pg else '%s'} AND rc.created_at <= {'?' if not is_pg else '%s'}""",
                (org_id, start.isoformat(), end.isoformat()),
            )
            row = cur.fetchone()
            if row and row[0]:
                out["confirmed_recovered"] = float(row[0])
    except Exception:
        pass
    finally:
        conn.close()
    return out


def _workflow_metrics(workflows: List[dict], start: datetime, end: datetime) -> dict:
    active = in_progress = blocked = awaiting = 0
    units_processed: set[str] = set()
    stage_verdicts: Dict[str, Dict[str, int]] = {s: {v: 0 for v in VERDICTS} for s in STAGES}
    stage_totals: Dict[str, int] = {s: 0 for s in STAGES}
    funnel: Dict[str, set] = {s: set() for s in STAGES}
    latency_samples: List[int] = []

    for wf in workflows:
        uid = wf.get("subject_id") or wf.get("unit_id")
        status = (wf.get("status") or "").upper()
        if status in ("IN_PROGRESS", "ACTIVE", "RUNNING"):
            in_progress += 1
            active += 1
        elif status in ("HALTED", "DEGRADED", "EXCEPTION", "BLOCKED"):
            blocked += 1
        updated = _parse_ts((wf.get("timestamps") or {}).get("updated_at"))
        if status == "COMPLETED" and _in_range(updated, start, end) and uid:
            units_processed.add(uid)

        needs_action = False
        for sr in wf.get("stage_results") or []:
            stage = sr.get("stage")
            if stage not in funnel:
                continue
            state = sr.get("state")
            if state not in ("pending", "skipped"):
                if uid:
                    funnel[stage].add(uid)
            finished = _parse_ts(sr.get("finished_at"))
            if state == "completed" and sr.get("evidence_status") == "completed":
                if _in_range(finished, start, end):
                    stage_totals[stage] = stage_totals.get(stage, 0) + 1
                    v = (sr.get("verdict") or "").upper()
                    if v in stage_verdicts.get(stage, {}):
                        stage_verdicts[stage][v] += 1
                    if sr.get("duration_ms"):
                        latency_samples.append(int(sr["duration_ms"]))
            if sr.get("needs_human") or (sr.get("verdict") or "").upper() == "UNCERTAIN":
                if state == "completed":
                    needs_action = True
        if needs_action:
            awaiting += 1

    return {
        "active_workflows": active,
        "in_progress": in_progress,
        "blocked_workflows": blocked,
        "awaiting_action": awaiting,
        "units_processed_in_period": len(units_processed),
        "stage_verdicts": stage_verdicts,
        "stage_totals": stage_totals,
        "funnel": {k: len(v) for k, v in funnel.items()},
        "median_latency_ms": sorted(latency_samples)[len(latency_samples) // 2] if latency_samples else None,
        "avg_latency_ms": round(sum(latency_samples) / len(latency_samples)) if latency_samples else None,
    }


def _verdict_totals_from_evidence(records: List[dict]) -> Dict[str, int]:
    counts = {v: 0 for v in VERDICTS}
    for rec in records:
        v = (rec.get("verdict") or "").upper()
        if v in counts:
            counts[v] += 1
    return counts


def _agent_performance_from_evidence(records: List[dict]) -> dict:
    performance = {
        stage: {"PASS": 0, "FAIL": 0, "UNCERTAIN": 0, "completed_in_period": 0}
        for stage in STAGES
    }
    for record in records:
        stage = record.get("stage")
        verdict = (record.get("verdict") or "").upper()
        evidence = record.get("evidence") or {}
        if (
            stage in performance
            and verdict in VERDICTS
            and evidence.get("status", "completed") == "completed"
        ):
            performance[stage][verdict] += 1
            performance[stage]["completed_in_period"] += 1
    return {
        stage: {
            "pass": counts["PASS"],
            "fail": counts["FAIL"],
            "uncertain": counts["UNCERTAIN"],
            "completed_in_period": counts["completed_in_period"],
        }
        for stage, counts in performance.items()
    }


def _trend_pct(current: float, previous: float) -> Optional[float]:
    if previous <= 0:
        return None if current <= 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def build_dashboard_summary(org_id: str, store, range_key: str = "30d", custom_start: Optional[str] = None, custom_end: Optional[str] = None) -> dict:
    start, end, prev_start, prev_end = resolve_date_range(range_key, custom_start, custom_end)
    workflows = store.list_workflows(org_id)
    wf_metrics = _workflow_metrics(workflows, start, end)
    evidence = _query_evidence(org_id, start, end)
    agent_performance = _agent_performance_from_evidence(evidence)
    prev_evidence = _query_evidence(org_id, prev_start, prev_end) if prev_start and prev_end else []
    verdicts = _verdict_totals_from_evidence(evidence)
    prev_verdicts = _verdict_totals_from_evidence(prev_evidence)
    eligible = sum(verdicts.values())
    pass_count = verdicts.get("PASS", 0)
    pass_rate = round((pass_count / eligible) * 100, 1) if eligible else None
    prev_eligible = sum(prev_verdicts.values())
    prev_pass_rate = (prev_verdicts.get("PASS", 0) / prev_eligible * 100) if prev_eligible else None

    success_num = pass_count
    success_den = eligible
    agent_success_rate = round((success_num / success_den) * 100, 1) if success_den else None

    reviews = _human_reviews(org_id)
    pending_reviews = len([r for r in reviews if (r.get("status") or "").upper() not in ("RESOLVED", "CLOSED")])
    recovery = _recovery_totals(org_id, start, end)

    return {
        "org_id": org_id,
        "range": {"key": range_key, "start": start.isoformat(), "end": end.isoformat()},
        "generated_at": _utcnow().isoformat(),
        "definitions": {
            "total_units": "Distinct units registered for org (units table).",
            "active_workflows": "Workflows with status IN_PROGRESS, ACTIVE, or RUNNING.",
            "units_processed": "Distinct units with workflow COMPLETED and updated_at in range.",
            "pass_rate": "PASS verdict evidence_records / all PASS+FAIL+UNCERTAIN evidence in range.",
            "agent_execution_success_rate": "Completed evidence PASS / all completed verdict evidence in range (excludes infra errors).",
        },
        "kpis": {
            "total_units": _count_units(org_id),
            "active_workflows": wf_metrics["active_workflows"],
            "units_processed": wf_metrics["units_processed_in_period"],
            "awaiting_action": wf_metrics["awaiting_action"],
            "pass_rate": pass_rate,
            "pass_rate_trend_pct": _trend_pct(pass_rate or 0, prev_pass_rate or 0) if pass_rate is not None and prev_pass_rate is not None else None,
            "fail_count": verdicts.get("FAIL", 0),
            "uncertain_count": verdicts.get("UNCERTAIN", 0),
            "pending_human_reviews": pending_reviews,
            "blocked_workflows": wf_metrics["blocked_workflows"],
            "agent_execution_success_rate": agent_success_rate,
            "agent_success_numerator": success_num,
            "agent_success_denominator": success_den,
            "recovery": recovery,
        },
        "funnel": wf_metrics["funnel"],
        "agent_performance": {
            stage: agent_performance[stage]
            for stage in STAGES
        },
        "verdict_distribution": {
            "counts": verdicts,
            "denominator": eligible,
            "percentages": {k: round((v / eligible) * 100, 1) if eligible else 0 for k, v in verdicts.items()},
        },
        "operational_health": {
            "metric": "agent_execution_success_rate",
            "percentage": agent_success_rate,
            "numerator": success_num,
            "denominator": success_den,
        },
        "latency": {
            "median_ms": wf_metrics["median_latency_ms"],
            "average_ms": wf_metrics["avg_latency_ms"],
        },
    }


def build_timeseries(org_id: str, store, range_key: str = "30d", custom_start: Optional[str] = None, custom_end: Optional[str] = None) -> dict:
    start, end, _, _ = resolve_date_range(range_key, custom_start, custom_end)
    days = max(1, (end - start).days)
    bucket = "hour" if days <= 2 else "day" if days <= 60 else "week" if days <= 365 else "month"

    def bucket_key(ts: datetime) -> str:
        if bucket == "hour":
            return ts.strftime("%Y-%m-%dT%H:00")
        if bucket == "week":
            return ts.strftime("%Y-W%W")
        if bucket == "month":
            return ts.strftime("%Y-%m")
        return ts.strftime("%Y-%m-%d")

    buckets: Dict[str, dict] = {}

    def ensure(k: str) -> dict:
        if k not in buckets:
            buckets[k] = {"registered_units": 0, "completed_workflows": 0, "failed_or_blocked": 0, "evidence_completed": 0}
        return buckets[k]

    conn = get_connection()
    is_pg = _is_pg(conn)
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"SELECT created_at FROM units WHERE org_id = {'?' if not is_pg else '%s'} AND created_at >= {'?' if not is_pg else '%s'} AND created_at <= {'?' if not is_pg else '%s'}",
                (org_id, start.isoformat(), end.isoformat()),
            )
            for (created_at,) in cur.fetchall():
                ts = _parse_ts(created_at)
                if ts:
                    ensure(bucket_key(ts))["registered_units"] += 1
    finally:
        conn.close()

    for wf in store.list_workflows(org_id):
        ts = _parse_ts((wf.get("timestamps") or {}).get("completed_at") or (wf.get("timestamps") or {}).get("updated_at"))
        if not _in_range(ts, start, end):
            continue
        b = ensure(bucket_key(ts))
        if (wf.get("status") or "").upper() == "COMPLETED":
            b["completed_workflows"] += 1
        elif (wf.get("status") or "").upper() in ("HALTED", "EXCEPTION", "BLOCKED", "DEGRADED"):
            b["failed_or_blocked"] += 1

    for rec in _query_evidence(org_id, start, end):
        ts = _parse_ts(rec.get("created_at"))
        if ts:
            ensure(bucket_key(ts))["evidence_completed"] += 1

    series = [{"period": k, **v} for k, v in sorted(buckets.items())]
    return {"bucket": bucket, "series": series}


def build_activity_feed(org_id: str, store, limit: int = 50) -> List[dict]:
    events: List[dict] = []
    conn = get_connection()
    is_pg = _is_pg(conn)
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"SELECT unit_id, sku, created_at FROM units WHERE org_id = {'?' if not is_pg else '%s'} ORDER BY created_at DESC LIMIT 20",
                (org_id,),
            )
            for unit_id, sku, created_at in cur.fetchall():
                events.append({
                    "type": "unit_registered",
                    "timestamp": created_at,
                    "unit_id": unit_id,
                    "stage": None,
                    "outcome": None,
                    "context": f"SKU {sku}",
                    "link": {"kind": "unit", "id": unit_id},
                })
            cur.execute(
                f"""SELECT workflow_id, subject_id, status, current_stage, created_at
                    FROM workflows WHERE org_id = {'?' if not is_pg else '%s'} ORDER BY created_at DESC LIMIT 20""",
                (org_id,),
            )
            for wf_id, subject_id, status, stage, created_at in cur.fetchall():
                events.append({
                    "type": "workflow_created",
                    "timestamp": created_at,
                    "unit_id": subject_id,
                    "stage": stage,
                    "outcome": status,
                    "context": wf_id,
                    "link": {"kind": "unit", "id": subject_id},
                })
            cur.execute(
                f"""SELECT e.unit_id, e.stage, e.verdict, e.evidence_id, e.created_at, e.reason
                    FROM evidence_records e
                    JOIN workflows w ON w.workflow_id = e.workflow_id
                    WHERE w.org_id = {'?' if not is_pg else '%s'}
                    ORDER BY e.created_at DESC LIMIT 30""",
                (org_id,),
            )
            for unit_id, stage, verdict, ev_id, created_at, reason in cur.fetchall():
                events.append({
                    "type": "verdict_recorded",
                    "timestamp": created_at,
                    "unit_id": unit_id,
                    "stage": stage,
                    "outcome": verdict,
                    "context": (reason or "")[:120],
                    "link": {"kind": "evidence", "id": ev_id, "unit_id": unit_id},
                })
    finally:
        conn.close()

    for wf in store.list_workflows(org_id):
        for sr in wf.get("stage_results") or []:
            if sr.get("state") == "error":
                events.append({
                    "type": "agent_error",
                    "timestamp": sr.get("finished_at") or (wf.get("timestamps") or {}).get("updated_at"),
                    "unit_id": wf.get("subject_id"),
                    "stage": sr.get("stage"),
                    "outcome": "error",
                    "context": "Stage execution error",
                    "link": {"kind": "unit", "id": wf.get("subject_id")},
                })

    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return events[:limit]


def build_location_summary(org_id: str) -> dict:
    """Summarize registered units by their operational fulfillment route."""
    conn = get_connection()
    is_pg = _is_pg(conn)
    rows: List[dict] = []
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"SELECT channel, COUNT(*) FROM units WHERE org_id = {'?' if not is_pg else '%s'} GROUP BY channel",
                (org_id,),
            )
            for channel, count in cur.fetchall():
                rows.append({"label": (channel or "unknown").upper(), "count": int(count), "kind": "fulfillment_route"})
    finally:
        conn.close()
    total = sum(row["count"] for row in rows)
    return {
        "summary": rows,
        "total_units": total,
        "note": f"{total} registered units grouped by fulfillment route.",
    }


def build_agent_dashboard(
    org_id: str,
    store,
    stage: str,
    range_key: str = "30d",
    verdict: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    sort: str = "updated_desc",
) -> dict:
    if stage not in STAGES:
        raise ValueError(f"Unknown stage {stage}")
    start, end, _, _ = resolve_date_range(range_key)
    workflows = store.list_workflows(org_id)
    rows: List[dict] = []

    conn = get_connection()
    is_pg = _is_pg(conn)
    unit_profiles: Dict[str, dict] = {}
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"SELECT unit_id, sku, fnsku, order_id, channel, variant, attributes FROM units WHERE org_id = {'?' if not is_pg else '%s'}",
                (org_id,),
            )
            keys = ["unit_id", "sku", "fnsku", "order_id", "channel", "variant", "attributes"]
            for row in cur.fetchall():
                rec = _row_dict(row, is_pg, keys)
                if isinstance(rec.get("attributes"), str):
                    try:
                        rec["attributes"] = json.loads(rec["attributes"])
                    except Exception:
                        rec["attributes"] = {}
                unit_profiles[rec["unit_id"]] = rec
    finally:
        conn.close()

    workflows_by_id = {wf.get("workflow_id"): wf for wf in workflows}
    stage_evidence = _query_evidence(org_id, start, end, stage)
    workflows_with_stage_evidence = {ev.get("workflow_id") for ev in stage_evidence}
    for ev in stage_evidence:
        uid = ev.get("unit_id")
        wf = workflows_by_id.get(ev.get("workflow_id"), {})
        sr = next(
            (item for item in (wf.get("stage_results") or []) if item.get("stage") == stage),
            {},
        )
        profile = unit_profiles.get(uid, {})
        evidence_data = ev.get("evidence") or {}
        decision = evidence_data.get("decision") or {}
        record_id = ev.get("evidence_id")
        v = (ev.get("verdict") or "").upper() or None
        row_status = "completed" if evidence_data.get("status", "completed") == "completed" else "error"
        if verdict and v != verdict.upper():
            continue
        if status_filter and row_status != status_filter:
            continue
        hay = f"{uid} {profile.get('sku', '')} {profile.get('order_id', '')}".lower()
        if search and search.lower() not in hay:
            continue

        payload = ev.get("payload") or {}
        checks = payload.get("checks", [])
        rows.append({
            "unit_id": uid,
            "workflow_id": ev.get("workflow_id"),
            "sku": profile.get("sku"),
            "fnsku": profile.get("fnsku"),
            "order_id": profile.get("order_id"),
            "route": profile.get("channel") or wf.get("route"),
            "execution_status": row_status,
            "evidence_status": evidence_data.get("status"),
            "verdict": v,
            "needs_human": decision.get("needs_human"),
            "duration_ms": sr.get("duration_ms") if sr.get("record_id") == record_id else None,
            "finished_at": ev.get("created_at"),
            "updated_at": ev.get("created_at"),
            "record_id": record_id,
            "checks_count": len(checks),
            "kanban_column": _kanban_column(
                {
                    "state": row_status,
                    "evidence_status": evidence_data.get("status"),
                    "verdict": v,
                    "needs_human": decision.get("needs_human"),
                },
                wf,
            ),
        })

    for wf in workflows:
        uid = wf.get("subject_id")
        sr = next((item for item in (wf.get("stage_results") or []) if item.get("stage") == stage), None)
        if not sr or sr.get("state") in ("skipped", "completed", "error"):
            continue
        if wf.get("workflow_id") in workflows_with_stage_evidence:
            continue
        if range_key != "all":
            updated = _parse_ts((wf.get("timestamps") or {}).get("updated_at"))
            if not _in_range(updated, start, end):
                continue
        profile = unit_profiles.get(uid, {})
        if verdict:
            continue
        hay = f"{uid} {profile.get('sku', '')} {profile.get('order_id', '')}".lower()
        if search and search.lower() not in hay:
            continue
        if status_filter and sr.get("state") != status_filter:
            continue
        rows.append({
            "unit_id": uid,
            "workflow_id": wf.get("workflow_id"),
            "sku": profile.get("sku"),
            "fnsku": profile.get("fnsku"),
            "order_id": profile.get("order_id"),
            "route": profile.get("channel") or wf.get("route"),
            "execution_status": sr.get("state") or "pending",
            "evidence_status": sr.get("evidence_status"),
            "verdict": sr.get("verdict"),
            "needs_human": sr.get("needs_human"),
            "duration_ms": sr.get("duration_ms"),
            "finished_at": sr.get("finished_at"),
            "updated_at": (wf.get("timestamps") or {}).get("updated_at"),
            "record_id": sr.get("record_id"),
            "checks_count": 0,
            "kanban_column": _kanban_column(sr, wf),
        })

    sort_key = {
        "unit_asc": lambda r: r["unit_id"] or "",
        "unit_desc": lambda r: r["unit_id"] or "",
        "updated_desc": lambda r: (_sort_timestamp(r.get("updated_at")), r.get("record_id") or ""),
        "updated_asc": lambda r: (_sort_timestamp(r.get("updated_at")), r.get("record_id") or ""),
        "verdict": lambda r: r.get("verdict") or "",
    }.get(sort, lambda r: _sort_timestamp(r.get("updated_at")))
    reverse = sort not in ("unit_asc", "updated_asc")
    rows.sort(key=sort_key, reverse=reverse)

    total = len(rows)
    start_idx = (max(1, page) - 1) * page_size
    page_rows = rows[start_idx : start_idx + page_size]

    perf = _agent_performance_from_evidence(stage_evidence).get(stage, {})
    return {
        "stage": stage,
        "range": {"key": range_key, "start": start.isoformat(), "end": end.isoformat()},
        "kpis": {
            "executions_completed": perf.get("completed_in_period", 0),
            "pass": perf.get("pass", 0),
            "fail": perf.get("fail", 0),
            "uncertain": perf.get("uncertain", 0),
            "pass_rate": round(perf["pass"] / perf["completed_in_period"] * 100, 1) if perf.get("completed_in_period") else None,
            "blocked": len([r for r in rows if r["kanban_column"] == "Blocked"]),
            "awaiting_review": len([r for r in rows if r["kanban_column"] == "Awaiting Review"]),
        },
        "pagination": {"page": page, "page_size": page_size, "total": total},
        "rows": page_rows,
        "kanban": _kanban_group(rows),
    }


def _kanban_column(sr: dict, wf: dict) -> str:
    state = sr.get("state")
    if state == "skipped":
        return "N/A"
    if state == "error" or (wf.get("status") or "").upper() in ("HALTED", "BLOCKED"):
        return "Blocked"
    if state == "running":
        return "Running"
    if sr.get("needs_human") or (sr.get("verdict") or "").upper() == "UNCERTAIN":
        return "Awaiting Review"
    if state == "completed" and sr.get("evidence_status") == "completed":
        return "Completed"
    if state == "pending":
        return "Queued"
    return "Ready to Run"


def _kanban_group(rows: List[dict]) -> Dict[str, List[dict]]:
    cols = ["Queued", "Ready to Run", "Running", "Awaiting Review", "Blocked", "Completed"]
    grouped = {c: [] for c in cols}
    for row in rows:
        col = row.get("kanban_column") or "Queued"
        if col not in grouped:
            grouped[col] = []
        grouped[col].append(row)
    return grouped
