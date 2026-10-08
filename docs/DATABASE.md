# CUBE Round 3 — Database Schema & Data Models

**Database Engine:** PostgreSQL (Production) / SQLite / FileStore (Local & Test)  

---

## 1. Relational Entity ERD & Data Dictionary

### Core Entities:

```text
organizations
  ├── id (UUID / String, PK)
  ├── name (String)
  └── created_at (Timestamp)

workflows
  ├── workflow_id (String, PK) e.g. "WF-org_demo_alpha-UNIT-0014"
  ├── org_id (String, FK -> organizations.id)
  ├── subject_id (String) e.g. "UNIT-0014"
  ├── flow_id (String) e.g. "standard-fba-mfn"
  ├── status (Enum: PENDING, IN_PROGRESS, COMPLETED, HALTED, FAILED, DEGRADED)
  ├── status_reason (Text)
  ├── current_stage (String)
  └── timestamps (JSONB: created_at, updated_at, completed_at)

stage_results
  ├── id (UUID, PK)
  ├── workflow_id (String, FK -> workflows.workflow_id)
  ├── stage (Enum: receiving, prep, pack, returns, recovery)
  ├── agent_id (String)
  ├── state (Enum: pending, completed, skipped, error)
  ├── record_id (String, FK -> evidence_records.record_id)
  ├── verdict (Enum: PASS, FAIL, UNCERTAIN)
  └── duration_ms (Integer)

evidence_records
  ├── record_id (String, PK) e.g. "RCV-UNIT-0014"
  ├── workflow_id (String, FK -> workflows.workflow_id)
  ├── stage (String)
  ├── agent_id (String)
  ├── status (String)
  ├── captured_at (Timestamp)
  ├── model (JSONB)
  ├── checks (JSONB Array)
  ├── decision (JSONB: verdict, outcome, confidence, reason, needs_human)
  ├── payload (JSONB)
  ├── upstream_refs (JSONB Array of record_ids)
  └── content_hash (String SHA-256)

overrides
  ├── override_id (String, PK) e.g. "OVR-001"
  ├── workflow_id (String, FK -> workflows.workflow_id)
  ├── record_id (String, FK -> evidence_records.record_id)
  ├── actor (String)
  ├── reason (Text)
  ├── original_verdict (String)
  ├── new_verdict (String)
  └── created_at (Timestamp)

recovery_claims
  ├── claim_id (String, PK)
  ├── workflow_id (String, FK -> workflows.workflow_id)
  ├── charge_type (String)
  ├── amount_usd (Numeric)
  ├── claim_amount (Numeric)
  ├── verdict (Enum: CONTRADICTED, SUPPORTED, SILENT, UNCERTAIN, EXPIRED)
  ├── sha256_hash (String)
  └── evidence_dna_tree (JSONB)
```

---

## 2. Evidence Contract Storage Rules

1. Raw media binary images/videos are saved in file storage under `organization/workflow/stage/`.
2. Evidence records store content-addressed file references (`sha256`, `ref`, `kind`) instead of absolute local file paths.
3. Every evidence record is immutable. Overrides do not modify or delete raw evidence records.
