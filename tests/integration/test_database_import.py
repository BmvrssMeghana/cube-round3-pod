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
