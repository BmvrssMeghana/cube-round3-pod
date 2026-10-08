"""
CUBE Round 3 - Centralized Production Database Layer
Supports PostgreSQL (via psycopg2) and SQLite (local fallback).
Maintains workflows, units, captures, evidence records, checks, charges, claims, and human review audit logs.
"""

import os
import json
import sqlite3
import psycopg2
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or ""
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cube_unified.db")

def get_connection():
    if DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://"):
        return psycopg2.connect(DATABASE_URL)
    else:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_connection()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    
    id_pk = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
    text_type = "TEXT"
    json_type = "JSONB" if is_postgres else "TEXT"
    timestamp_type = "TIMESTAMPTZ" if is_postgres else "TEXT"

    with conn:
        cursor = conn.cursor()
        
        # Workflows table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS workflows (
            workflow_id {text_type} PRIMARY KEY,
            subject_id {text_type} NOT NULL,
            route {text_type} NOT NULL,
            current_stage {text_type} NOT NULL,
            status {text_type} NOT NULL,
            final_outcome {text_type},
            org_id {text_type} DEFAULT 'org_demo_alpha',
            created_at {timestamp_type},
            updated_at {timestamp_type}
        )
        """)

        # Units table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS units (
            unit_id {text_type} PRIMARY KEY,
            sku {text_type} NOT NULL,
            expected_quantity INTEGER DEFAULT 1,
            variant {text_type},
            fnsku {text_type},
            order_id {text_type},
            customer_id {text_type},
            created_at {timestamp_type}
        )
        """)

        # Captures / Images table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS captures (
            capture_id {text_type} PRIMARY KEY,
            unit_id {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            image_path {text_type},
            image_base64 {text_type},
            created_at {timestamp_type}
        )
        """)

        # Evidence Records table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS evidence_records (
            evidence_id {text_type} PRIMARY KEY,
            workflow_id {text_type} NOT NULL,
            unit_id {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            verdict {text_type} NOT NULL,
            confidence REAL NOT NULL,
            reason {text_type},
            model_name {text_type},
            model_version {text_type},
            vision_mode {text_type} DEFAULT 'AI Vision',
            metadata_json {json_type},
            created_at {timestamp_type}
        )
        """)

        # Evidence Checks table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS evidence_checks (
            check_id {id_pk},
            evidence_id {text_type} NOT NULL,
            check_name {text_type} NOT NULL,
            status {text_type} NOT NULL,
            score REAL,
            confidence REAL,
            detail {text_type},
            created_at {timestamp_type}
        )
        """)

        # Upstream Evidence table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS upstream_evidence (
            id {id_pk},
            evidence_id {text_type} NOT NULL,
            upstream_evidence_id {text_type} NOT NULL
        )
        """)

        # Financial Charges table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS charges (
            charge_id {text_type} PRIMARY KEY,
            unit_id {text_type} NOT NULL,
            amount REAL NOT NULL,
            reason {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            created_at {timestamp_type}
        )
        """)

        # Recovery Claims table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS recovery_claims (
            claim_id {text_type} PRIMARY KEY,
            unit_id {text_type} NOT NULL,
            charge_id {text_type} NOT NULL,
            position {text_type} NOT NULL,
            claim_recommended {text_type} NOT NULL,
            claim_amount REAL NOT NULL,
            reasoning {text_type},
            dispute_letter {text_type},
            created_at {timestamp_type}
        )
        """)

        # Human Reviews & Audit Logs table
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS human_reviews (
            review_id {text_type} PRIMARY KEY,
            exception_id {text_type},
            workflow_id {text_type} NOT NULL,
            stage {text_type} NOT NULL,
            old_verdict {text_type} NOT NULL,
            new_verdict {text_type} NOT NULL,
            reason {text_type} NOT NULL,
            actor {text_type} DEFAULT 'human_reviewer',
            status {text_type} DEFAULT 'RESOLVED',
            timestamp {timestamp_type}
        )
        """)

    conn.close()

# Helper Functions for DB Queries & Updates

def save_unit_db(unit_id: str, sku: str, expected_quantity: int = 1, variant: Optional[str] = None, fnsku: Optional[str] = None, order_id: Optional[str] = None):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO units (unit_id, sku, expected_quantity, variant, fnsku, order_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT(unit_id) DO UPDATE SET sku=EXCLUDED.sku, expected_quantity=EXCLUDED.expected_quantity
        """ if isinstance(conn, psycopg2.extensions.connection) else """
        INSERT OR REPLACE INTO units (unit_id, sku, expected_quantity, variant, fnsku, order_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (unit_id, sku, expected_quantity, variant, fnsku, order_id, now))
    conn.close()

def save_workflow_db(workflow_id: str, subject_id: str, route: str = "FBA", current_stage: str = "receiving", status: str = "ACTIVE", final_outcome: Optional[str] = None, org_id: str = "org_demo_alpha"):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO workflows (workflow_id, subject_id, route, current_stage, status, final_outcome, org_id, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT(workflow_id) DO UPDATE SET current_stage=EXCLUDED.current_stage, status=EXCLUDED.status, final_outcome=EXCLUDED.final_outcome, updated_at=EXCLUDED.updated_at
        """ if isinstance(conn, psycopg2.extensions.connection) else """
        INSERT OR REPLACE INTO workflows (workflow_id, subject_id, route, current_stage, status, final_outcome, org_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (workflow_id, subject_id, route, current_stage, status, final_outcome, org_id, now, now))
    conn.close()

def save_capture_db(capture_id: str, unit_id: str, stage: str, image_path: Optional[str] = None, image_base64: Optional[str] = None):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO captures (capture_id, unit_id, stage, image_path, image_base64, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT(capture_id) DO NOTHING
        """ if isinstance(conn, psycopg2.extensions.connection) else """
        INSERT OR IGNORE INTO captures (capture_id, unit_id, stage, image_path, image_base64, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (capture_id, unit_id, stage, image_path, image_base64, now))
    conn.close()

def save_evidence_db(record: Dict[str, Any]):
    conn = get_connection()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    now = datetime.now(timezone.utc).isoformat()
    
    evidence_id = record["evidence_id"]
    workflow_id = record["workflow_id"]
    unit_id = record["subject_id"]
    stage = record["stage"]
    verdict = record["verdict"]
    confidence = float(record.get("confidence", 1.0))
    reason = record.get("reason", "")
    model_info = record.get("model", {})
    model_name = model_info.get("name", "CUBE-Vision-Core") if isinstance(model_info, dict) else str(model_info)
    model_version = model_info.get("version", "v3.0.0") if isinstance(model_info, dict) else "v3.0.0"
    vision_mode = record.get("vision_mode", "AI Vision")
    metadata_json = json.dumps(record.get("payload", {}))

    with conn:
        cursor = conn.cursor()
        # Insert evidence record
        cursor.execute("""
        INSERT INTO evidence_records (evidence_id, workflow_id, unit_id, stage, verdict, confidence, reason, model_name, model_version, vision_mode, metadata_json, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT(evidence_id) DO UPDATE SET verdict=EXCLUDED.verdict, confidence=EXCLUDED.confidence, reason=EXCLUDED.reason
        """ if is_postgres else """
        INSERT OR REPLACE INTO evidence_records (evidence_id, workflow_id, unit_id, stage, verdict, confidence, reason, model_name, model_version, vision_mode, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (evidence_id, workflow_id, unit_id, stage, verdict, confidence, reason, model_name, model_version, vision_mode, metadata_json, now))

        # Insert individual checks if present in payload
        payload = record.get("payload", {})
        checks = payload.get("checks", [])
        for chk in checks:
            check_name = chk.get("check_name", chk.get("name", "check"))
            status = chk.get("status", "PASS")
            score = float(chk.get("score", 1.0))
            chk_conf = float(chk.get("confidence", confidence))
            detail = chk.get("reason", chk.get("detail", ""))
            cursor.execute("""
            INSERT INTO evidence_checks (evidence_id, check_name, status, score, confidence, detail, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """ if is_postgres else """
            INSERT INTO evidence_checks (evidence_id, check_name, status, score, confidence, detail, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (evidence_id, check_name, status, score, chk_conf, detail, now))

        # Insert upstream evidence references
        upstream_ids = record.get("upstream_evidence_ids", [])
        for up_id in upstream_ids:
            cursor.execute("""
            INSERT INTO upstream_evidence (evidence_id, upstream_evidence_id)
            VALUES (%s, %s)
            """ if is_postgres else """
            INSERT INTO upstream_evidence (evidence_id, upstream_evidence_id)
            VALUES (?, ?)
            """, (evidence_id, up_id))

    conn.close()

def save_human_review_db(review_id: str, exception_id: str, workflow_id: str, stage: str, old_verdict: str, new_verdict: str, reason: str, actor: str = "human_reviewer"):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO human_reviews (review_id, exception_id, workflow_id, stage, old_verdict, new_verdict, reason, actor, status, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'RESOLVED', %s)
        ON CONFLICT(review_id) DO UPDATE SET new_verdict=EXCLUDED.new_verdict, reason=EXCLUDED.reason, timestamp=EXCLUDED.timestamp
        """ if isinstance(conn, psycopg2.extensions.connection) else """
        INSERT OR REPLACE INTO human_reviews (review_id, exception_id, workflow_id, stage, old_verdict, new_verdict, reason, actor, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RESOLVED', ?)
        """, (review_id, exception_id, workflow_id, stage, old_verdict, new_verdict, reason, actor, now))
    conn.close()

def get_evidence_for_unit(unit_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    records = []
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evidence_records WHERE unit_id = ? ORDER BY created_at ASC" if not isinstance(conn, psycopg2.extensions.connection) else "SELECT * FROM evidence_records WHERE unit_id = %s ORDER BY created_at ASC", (unit_id,))
        rows = cursor.fetchall()
        for r in rows:
            rec = dict(r) if isinstance(r, sqlite3.Row) else {
                "evidence_id": r[0], "workflow_id": r[1], "unit_id": r[2], "stage": r[3],
                "verdict": r[4], "confidence": r[5], "reason": r[6], "model_name": r[7],
                "model_version": r[8], "vision_mode": r[9], "metadata_json": r[10], "created_at": r[11]
            }
            if isinstance(rec.get("metadata_json"), str):
                try:
                    rec["payload"] = json.loads(rec["metadata_json"])
                except Exception:
                    rec["payload"] = {}
            else:
                rec["payload"] = rec.get("metadata_json") or {}
            records.append(rec)
    conn.close()
    return records
