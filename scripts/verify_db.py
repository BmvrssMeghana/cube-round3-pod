"""Verify the configured SQL connection, schema, and imported source-data counts."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from orchestration.db import DATABASE_URL, get_connection, init_db, is_postgres_connection

def main():
    init_db()
    conn = get_connection()
    is_pg = is_postgres_connection(conn)
    print("DATABASE_URL set:", bool(DATABASE_URL))
    print("DATABASE ENGINE:", "PostgreSQL" if is_pg else "SQLite (local fallback)")
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1"
            if is_pg
            else "SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1"
        )
        print("TABLES:", [row[0] for row in cur.fetchall()])

        cur.execute("SELECT source_file, COUNT(*) FROM source_records GROUP BY source_file ORDER BY source_file")
        print("SOURCE ROWS BY FILE:", {filename: int(count) for filename, count in cur.fetchall()})

        cur.execute(
            "SELECT org_id, COUNT(*) FROM units GROUP BY org_id ORDER BY org_id"
        )
        print("UNITS BY ORGANIZATION:", {org_id: int(count) for org_id, count in cur.fetchall()})

        cur.execute(
            "SELECT org_id, COUNT(*) FROM workflows GROUP BY org_id ORDER BY org_id"
        )
        print("WORKFLOWS BY ORGANIZATION:", {org_id: int(count) for org_id, count in cur.fetchall()})
    finally:
        conn.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
