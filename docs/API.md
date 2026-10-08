# CUBE Round 3 — Unified API Reference

**Base Server:** `http://localhost:8100`  

---

## 1. Endpoints Overview

| Method | Endpoint | Description | Request Body Example / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System health & agent readiness | N/A |
| `POST` | `/workflows` | Start or advance workflow for unit | `{"org_id": "org_demo_alpha", "unit_id": "UNIT-0014"}` |
| `GET` | `/workflows/{id}` | Get current workflow state | N/A |
| `GET` | `/workflows/{id}/evidence` | Get workflow state + all stored evidence records | N/A |
| `POST` | `/workflows/{id}/resume` | Resume halted workflow after human review | N/A |
| `POST` | `/workflows/{id}/overrides` | Apply human verdict override | `{"record_id": "RCV-UNIT-0014", "new_verdict": "PASS", "actor": "OpsLead", "reason": "Manually verified label"}` |

---

## 2. API Response Examples

### `GET /health`
```json
{
  "status": "ok",
  "flow": "standard-fba-mfn",
  "agents": {
    "receiving": { "status": "ok", "mode": "inproc" },
    "prep": { "status": "ok", "mode": "inproc" },
    "pack": { "status": "ok", "mode": "inproc" },
    "returns": { "status": "ok", "mode": "inproc" },
    "recovery": { "status": "ok", "mode": "inproc" }
  }
}
```

### `POST /workflows`
```json
{
  "schema_version": "1.0",
  "workflow_id": "WF-org_demo_alpha-UNIT-0014",
  "status": "COMPLETED",
  "subject_id": "UNIT-0014",
  "stage_results": [
    { "stage": "receiving", "state": "completed", "verdict": "PASS" },
    { "stage": "prep", "state": "completed", "verdict": "PASS" },
    { "stage": "pack", "state": "completed", "verdict": "PASS" },
    { "stage": "returns", "state": "completed", "verdict": "PASS" },
    { "stage": "recovery", "state": "completed", "verdict": "FAIL" }
  ]
}
```
