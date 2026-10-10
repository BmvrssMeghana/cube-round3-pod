from collections import Counter

from orchestration import db
from orchestration.store import DatabaseStore
from scripts.import_sample_csv_to_db import CSV_SOURCES, import_data
from shared.utils import sample_data


def test_sample_csv_import_is_database_backed_and_idempotent(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATABASE_URL", "")
    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "import-test.sqlite"))

    first = import_data()
    second = import_data()

    expected_counts = {filename: len(sample_data.rows(kind)) for kind, filename in CSV_SOURCES.items()}
    assert first["database"] == "SQLite"
    assert first["source_rows"] == expected_counts
    assert second["source_rows"] == expected_counts
    assert first["total_source_rows"] == 276
    assert first["units"] == second["units"] == 100
    assert first["workflows"] == second["workflows"] == 100

    store = DatabaseStore()
    alpha = store.list_workflows("org_demo_alpha")
    bravo = store.list_workflows("org_demo_bravo")
    assert len(alpha) == 67
    assert len(bravo) == 33
    assert all(workflow.get("context", {}).get("source_data_imported") for workflow in alpha + bravo)

    demo_workflows = {workflow["subject_id"]: workflow for workflow in alpha + bravo}
    unrouted_demo_units = {
        "UNIT-0001", "UNIT-0017", "UNIT-0037", "UNIT-0040", "UNIT-0060",
        "UNIT-0069", "UNIT-0086", "UNIT-0087", "UNIT-0091",
    }
    returned_demo_units = {"UNIT-0017", "UNIT-0069", "UNIT-0091"}
    assert all(demo_workflows[unit]["context"]["route"] == "fba" for unit in unrouted_demo_units)
    assert {
        unit for unit in unrouted_demo_units if demo_workflows[unit]["context"]["returned"]
    } == returned_demo_units
    for unit in unrouted_demo_units:
        states = {item["stage"]: item["state"] for item in demo_workflows[unit]["stage_results"]}
        assert states["prep"] == states["pack"] == "pending"
        assert states["returns"] == ("pending" if unit in returned_demo_units else "skipped")

    records = db.get_source_records_for_unit("UNIT-0001", "org_demo_alpha")
    assert Counter(record["record_type"] for record in records)["receiving"] == 1
    assert records[0]["record_data"]["unit_id"] == "UNIT-0001"

    conn = db.get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM source_records")
            assert cursor.fetchone()[0] == 276
    finally:
        conn.close()
