"""Where workflow state and evidence live. Two implementations of one tiny interface.

MemoryStore: tests and library use. FileStore: the CLI and API (JSON files under out/).
Swap in a database by implementing the same four methods. Evidence is IMMUTABLE: a record_id, once written,
can only be written again with identical content.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from orchestration import db


class EvidenceConflict(Exception):
    pass


class MemoryStore:
    def __init__(self) -> None:
        self.workflows: dict[str, dict] = {}
        self.evidence: dict[str, dict] = {}

    def load_workflow(self, workflow_id: str) -> dict | None:
        wf = self.workflows.get(workflow_id)
        return json.loads(json.dumps(wf)) if wf else None

    def save_workflow(self, wf: dict) -> None:
        self.workflows[wf["workflow_id"]] = json.loads(json.dumps(wf))

    def list_workflows(self, org_id: str | None = None) -> list[dict]:
        items = self.workflows.values()
        if org_id is not None:
            items = (wf for wf in items if wf.get("org_id") == org_id)
        return json.loads(json.dumps(list(items)))

    def get_evidence(self, record_id: str) -> dict | None:
        return self.evidence.get(record_id)

    def put_evidence(self, record: dict) -> None:
        existing = self.evidence.get(record["record_id"])
        if existing and existing["content_hash"] != record["content_hash"]:
            raise EvidenceConflict(f"{record['record_id']} already exists with different content; evidence is immutable")
        self.evidence.setdefault(record["record_id"], record)


class FileStore(MemoryStore):
    def __init__(self, root: str | Path | None = None) -> None:
        super().__init__()
        self.root = Path(root or os.environ.get("OUT_DIR", "out"))
        (self.root / "workflows").mkdir(parents=True, exist_ok=True)
        (self.root / "evidence").mkdir(parents=True, exist_ok=True)

    def load_workflow(self, workflow_id: str) -> dict | None:
        p = self.root / "workflows" / f"{workflow_id}.json"
        return json.loads(p.read_text()) if p.exists() else None

    def list_workflows(self, org_id: str | None = None) -> list[dict]:
        workflows = [
            json.loads(path.read_text())
            for path in sorted((self.root / "workflows").glob("*.json"))
        ]
        if org_id is not None:
            workflows = [wf for wf in workflows if wf.get("org_id") == org_id]
        return workflows

    def save_workflow(self, wf: dict) -> None:
        p = self.root / "workflows" / f"{wf['workflow_id']}.json"
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(wf, indent=2))
        tmp.replace(p)  # atomic: a crash never leaves half a workflow

    def get_evidence(self, record_id: str) -> dict | None:
        p = self.root / "evidence" / f"{record_id}.json"
        return json.loads(p.read_text()) if p.exists() else None

    def put_evidence(self, record: dict) -> None:
        existing = self.get_evidence(record["record_id"])
        if existing and existing["content_hash"] != record["content_hash"]:
            raise EvidenceConflict(f"{record['record_id']} already exists with different content; evidence is immutable")
        if not existing:
            (self.root / "evidence" / f"{record['record_id']}.json").write_text(json.dumps(record, indent=2))


class DatabaseStore:
    """Persist workflow state and evidence in the configured SQL database."""

    def load_workflow(self, workflow_id: str) -> dict | None:
        conn = db.get_connection()
        is_pg = db.is_postgres_connection(conn)
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT workflow_data FROM workflows WHERE workflow_id = %s"
                    if is_pg
                    else "SELECT workflow_data FROM workflows WHERE workflow_id = ?",
                    (workflow_id,),
                )
                row = cursor.fetchone()
            if not row or row[0] is None:
                return None
            return _decode_json(row[0])
        finally:
            conn.close()

    def save_workflow(self, wf: dict) -> None:
        context = wf.get("context") or {}
        db.save_workflow_db(
            workflow_id=wf["workflow_id"],
            subject_id=wf["subject_id"],
            route=str(context.get("route") or "unknown").upper(),
            current_stage=wf.get("current_stage") or "receiving",
            status=wf.get("status", "PENDING"),
            final_outcome=json.dumps(wf.get("final_outcome")) if wf.get("final_outcome") is not None else None,
            org_id=wf["org_id"],
            workflow_data=wf,
        )

    def list_workflows(self, org_id: str | None = None) -> list[dict]:
        conn = db.get_connection()
        is_pg = db.is_postgres_connection(conn)
        try:
            with conn:
                cursor = conn.cursor()
                if org_id is None:
                    cursor.execute("SELECT workflow_data FROM workflows ORDER BY updated_at DESC")
                else:
                    cursor.execute(
                        "SELECT workflow_data FROM workflows WHERE org_id = %s ORDER BY updated_at DESC"
                        if is_pg
                        else "SELECT workflow_data FROM workflows WHERE org_id = ? ORDER BY updated_at DESC",
                        (org_id,),
                    )
                rows = cursor.fetchall()
            return [_decode_json(row[0]) for row in rows if row[0] is not None]
        finally:
            conn.close()

    def get_evidence(self, record_id: str) -> dict | None:
        return db.get_evidence_record(record_id)

    def put_evidence(self, record: dict) -> None:
        existing = self.get_evidence(record["record_id"])
        if existing and existing.get("content_hash") != record.get("content_hash"):
            raise EvidenceConflict(
                f"{record['record_id']} already exists with different content; evidence is immutable"
            )
        db.save_evidence_db(record)


def _decode_json(value):
    if isinstance(value, str):
        return json.loads(value)
    return value
