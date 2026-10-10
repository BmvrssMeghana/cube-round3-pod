import json
import sqlite3
from datetime import datetime, timezone

from orchestration import dashboard


def test_agent_dashboard_lists_each_saved_execution_for_a_unit(monkeypatch, tmp_path):
    database_path = tmp_path / "dashboard.sqlite"
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.executescript("""
        CREATE TABLE workflows (workflow_id TEXT, org_id TEXT);
        CREATE TABLE units (
            unit_id TEXT, org_id TEXT, sku TEXT, fnsku TEXT, order_id TEXT, channel TEXT, variant TEXT, attributes TEXT
        );
        CREATE TABLE evidence_records (
            evidence_id TEXT, workflow_id TEXT, unit_id TEXT, stage TEXT, verdict TEXT, confidence REAL,
            reason TEXT, model_name TEXT, model_version TEXT, vision_mode TEXT, metadata_json TEXT,
            evidence_data TEXT, created_at TEXT
        );
    """)
    now = datetime.now(timezone.utc).isoformat()
    workflow_id = "WF-org_test-UNIT-1"
    connection.execute("INSERT INTO workflows VALUES (?, ?)", (workflow_id, "org_test"))
    connection.execute(
        "INSERT INTO units VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ("UNIT-1", "org_test", "SKU-1", "FNSKU-1", "ORDER-1", "fba", "blue", "{}"),
    )
    for record_id, verdict in (("RCV-1", "FAIL"), ("RCV-2", "PASS")):
        evidence = {
            "status": "completed",
            "decision": {"verdict": verdict, "needs_human": False},
        }
        connection.execute(
            "INSERT INTO evidence_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record_id, workflow_id, "UNIT-1", "receiving", verdict, 1.0, "test",
                "test-agent", "1", "manual", json.dumps({"checks": []}), json.dumps(evidence), now,
            ),
        )
    connection.commit()
    connection.close()

    def connect():
        result = sqlite3.connect(database_path)
        result.row_factory = sqlite3.Row
        return result

    monkeypatch.setattr(dashboard, "get_connection", connect)
    query_evidence = dashboard._query_evidence

    def query_evidence_with_postgres_timestamps(*args, **kwargs):
        records = query_evidence(*args, **kwargs)
        records[0]["created_at"] = datetime.fromisoformat(records[0]["created_at"])
        return records

    monkeypatch.setattr(dashboard, "_query_evidence", query_evidence_with_postgres_timestamps)

    class Store:
        def list_workflows(self, org_id):
            return [{
                "workflow_id": workflow_id,
                "subject_id": "UNIT-1",
                "route": "FBA",
                "stage_results": [{
                    "stage": "receiving",
                    "state": "completed",
                    "evidence_status": "completed",
                    "record_id": "RCV-2",
                    "verdict": "PASS",
                    "duration_ms": 12,
                }],
            }]

    result = dashboard.build_agent_dashboard("org_test", Store(), "receiving", "all")

    assert result["kpis"]["executions_completed"] == 2
    assert result["kpis"]["pass"] == 1
    assert result["kpis"]["fail"] == 1
    assert {row["record_id"] for row in result["rows"]} == {"RCV-1", "RCV-2"}
