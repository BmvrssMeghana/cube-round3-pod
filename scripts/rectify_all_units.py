"""Rectify all units and workflows in the database so no stages are skipped."""

import json
from orchestration.db import get_connection, is_postgres_connection

ALL_STAGES = ["receiving", "prep", "pack", "returns", "recovery"]

def rectify_database():
    conn = get_connection()
    is_pg = is_postgres_connection(conn)
    cur = conn.cursor()

    cur.execute("SELECT workflow_id, subject_id, workflow_data FROM workflows")
    rows = cur.fetchall()
    updated_count = 0

    for workflow_id, subject_id, wf_data in rows:
        if isinstance(wf_data, str):
            wf_data = json.loads(wf_data)

        stage_results = wf_data.get("stage_results", [])
        existing_stages = {s.get("stage"): s for s in stage_results}
        modified = False

        new_stage_results = []
        for stage_name in ALL_STAGES:
            if stage_name in existing_stages:
                sr = existing_stages[stage_name]
                if sr.get("state") == "skipped":
                    sr["state"] = "pending"
                    sr["skipped_reason"] = None
                    modified = True
                new_stage_results.append(sr)
            else:
                new_stage_results.append({
                    "stage": stage_name,
                    "agent_id": f"{stage_name}-agent@v1.0",
                    "state": "pending",
                    "skipped_reason": None,
                    "record_id": None,
                    "evidence_status": None,
                    "verdict": None,
                    "outcome": None,
                    "needs_human": None,
                    "runs": 0,
                    "attempts": 0,
                    "started_at": None,
                    "finished_at": None,
                    "duration_ms": None,
                    "error": None
                })
                modified = True

        if modified:
            wf_data["stage_results"] = new_stage_results
            if is_pg:
                cur.execute(
                    "UPDATE workflows SET workflow_data = %s WHERE workflow_id = %s",
                    (json.dumps(wf_data), workflow_id)
                )
            else:
                cur.execute(
                    "UPDATE workflows SET workflow_data = ? WHERE workflow_id = ?",
                    (json.dumps(wf_data), workflow_id)
                )
            updated_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully rectified {updated_count} workflows. All 5 operational stages are now enabled for all units!")

if __name__ == "__main__":
    rectify_database()
