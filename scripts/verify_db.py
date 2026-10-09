"""Verify PostgreSQL connection and schema (Gate 0 proof helper)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from orchestration.db import init_db, get_connection

def main():
    url = os.environ.get("DATABASE_URL", "")
    print("DATABASE_URL set:", bool(url))
    init_db()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1"
        if "postgres" in url
        else "SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1"
    )
    tables = [r[0] for r in cur.fetchall()]
    print("TABLES:", tables)
    conn.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
