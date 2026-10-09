"""Bootstrap tenant + unit records in PostgreSQL (no CSV seed)."""
from __future__ import annotations

import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from orchestration.db import ensure_organization, init_db, save_unit_db


def main() -> int:
    parser = argparse.ArgumentParser(description="Create org and optional unit in PostgreSQL")
    parser.add_argument("--org-id", default="org_demo_alpha")
    parser.add_argument("--org-name", default="Demo Alpha Warehouse")
    parser.add_argument("--unit-id", help="Optional unit to register")
    parser.add_argument("--sku", help="SKU when unit-id is set")
    parser.add_argument("--route", default="fba", choices=("fba", "mfn"))
    parser.add_argument("--returned", action="store_true")
    args = parser.parse_args()

    if not os.environ.get("DATABASE_URL"):
        print("Set DATABASE_URL to a PostgreSQL connection string first.", file=sys.stderr)
        return 1

    init_db()
    ensure_organization(args.org_id, args.org_name)
    print(f"Organization {args.org_id!r} ready.")

    if args.unit_id:
        if not args.sku:
            print("--sku is required with --unit-id", file=sys.stderr)
            return 1
        save_unit_db(
            unit_id=args.unit_id,
            org_id=args.org_id,
            sku=args.sku,
            channel=args.route,
            is_returned=args.returned,
        )
        print(f"Unit {args.unit_id!r} ({args.sku}) registered under {args.org_id!r}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
