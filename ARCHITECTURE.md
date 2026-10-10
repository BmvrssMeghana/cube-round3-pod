# CUBE Commerce Operations — Architecture

This document describes the current integrated application and its stage-level specialist responsibilities. It distinguishes the running implementation from the more granular CV/OCR responsibilities that guide future agent decomposition.

## 1. System overview

```text
 Browser
   │
   ▼
 React + TypeScript + Vite
   │ bearer token; organization is derived from authenticated account
   ▼
 FastAPI application (orchestration/api.py)
   ├── Authentication and organization authorization
   ├── Workflow, inspection, dashboard, review, and evidence APIs
   ├── Orchestrator ── conditional routing / retries / state and outcome rollup
   │      ├── Receiving manager (agents/receiving/app.py)
   │      ├── Prep manager      (agents/prep/app.py)
   │      ├── Pack manager      (agents/pack/app.py)
   │      ├── Returns manager   (agents/returns/app.py)
   │      └── Recovery manager  (agents/recovery/app.py)
   └── Database access (orchestration/db.py, orchestration/store.py)
          ├── SQLite: data/cube_unified.db by default
          └── PostgreSQL: when DATABASE_URL is configured
```

The default manifests in `agents/<stage>/agent.json` use in-process execution. The orchestrator can use the configured HTTP client mode for a stage, but the standard local setup is one API process calling the five stage handlers directly.

## 2. Runtime components and ownership

| Component | Owns | Does not own |
|---|---|---|
| **Frontend** (`frontend/src/`) | Landing/sign-in flow, navigation, unit operations, passports, review queue, dashboards, analytics, and theme preference. | Authentication decisions, tenant authorization, or persistent workflow state. |
| **FastAPI API** (`orchestration/api.py`) | Authentication middleware, organization authorization, request validation/dispatch, and dashboard/workflow/inspection endpoints. | Stage-specific business judgments or the final outcome policy. |
| **Orchestrator** (`orchestration/orchestrator.py`) | Creating workflows, evaluating stage conditions, invoking stage managers, validating outputs, recording stage results, resume/override operations, and maintaining workflow transitions. | Vision judgments or rewriting the meaning of an agent's raw evidence. |
| **Stage manager** (`agents/<stage>/app.py`) | One stage's checks and decision, returned as a structured result with evidence. | Calling the next stage directly or choosing the workflow's final outcome. |
| **Rollup** (`orchestration/rollup.py`) | Deriving workflow status and final outcome from stage evidence and effective overrides. | Changing stage evidence or silently converting UNCERTAIN to PASS. |
| **Database layer** (`orchestration/db.py`, `orchestration/store.py`) | Units, workflows, evidence, checks, source rows, claims, organization accounts, and review history. | Deciding which stage should execute next. |

## 3. Stage flow and conditional routing

The standard flow is data-driven in `orchestration/flow.json`:

```text
Receiving
   │
   ├── FBA ──▶ Prep
   │             │
   └─────────────┴──▶ Pack (configured for FBA and MFN)
                           │
                 returned=true?
                     yes │
                         ▼
                      Returns
                         │
                         ▼
                      Recovery
                         │
                         ▼
                 Final workflow outcome
```

More precisely, the current flow applies these conditions:

| Stage | Condition |
|---|---|
| Receiving | Always first. |
| Prep | `route` is `fba`. |
| Pack | `route` is `fba` or `mfn`. |
| Returns | `returned` is `true`. |
| Recovery | Always after the preceding applicable stages. |

The flow also defines a 30-second stage timeout, one retry, and `continue` defaults for uncertain results and errors. Routing changes belong in `orchestration/flow.json`; outcome policy belongs in `orchestration/rollup.py`.

## 4. Specialist workstreams inside each manager

The named specialists below describe the work that a manager must coordinate and the evidence it should produce. They are **logical workstreams**, not 30 independent API services or separately scheduled agents. The current workflow boundary remains five stage managers, each called through one `handle(request)` entry point. See [`docs/agent-design.md`](docs/agent-design.md) for the longer design brief.

### Receiving — 6 specialists

| Specialist | Responsibility | Expected result |
|---|---|---|
| **REC-1 · Capture & Quality Gate** (rules/CV) | Evaluate capture acceptability and integrity. | Accepted shots with SHA-256 references, or retake guidance. |
| **REC-2 · Identity Resolver** (OCR + vision) | Compare observed item identity to PO identity. | SKU/ASIN verdict and observed identifiers. |
| **REC-3 · Quantity Counter** (vision) | Count cartons and units per carton. | Expected and observed quantities with discrepancy checks. |
| **REC-4 · Variant Checker** (vision) | Compare visual variant attributes against the PO. | Colour/size comparison and verdict. |
| **REC-5 · Damage Inspector** (vision) | Identify carton and unit damage. | Findings and relevant image regions. |
| **REC-6 · Decision & Evidence Builder** (rules) | Consolidate checks and determine the stage result. | Checks, disposition, supplier-claim draft when appropriate, and evidence links. |

### Prep — 6 specialists

| Specialist | Responsibility | Expected result |
|---|---|---|
| **PRP-1 · Requirement Resolver** (rules) | Select applicable category requirements. | Versioned rules and visually-checkable flags. |
| **PRP-2 · Capture Guide & Gate** (rules/CV) | Verify required views are present and usable. | Accepted capture set or specific retake request. |
| **PRP-3 · Polybag & Seal Checker** (vision) | Check bag presence and seal. | Observations and seal verdict. |
| **PRP-4 · Warning Reader** (OCR + vision) | Read and assess required warning labels. | Warning visibility and legibility result. |
| **PRP-5 · Label & Barcode Inspector** (vision + OCR) | Inspect FNSKU placement, barcode coverage, expiry, and handling marks. | Per-rule label and barcode findings. |
| **PRP-6 · Compliance Decider** (rules) | Consolidate applicable prep checks. | Cited per-rule table, overall status, and evidence. |

### Pack — 5 specialists

| Specialist | Responsibility | Expected result |
|---|---|---|
| **PCK-1 · Capture Guide & Gate** (rules/CV) | Assess required open-box views and occlusion. | Accepted shots or retake guidance. |
| **PCK-2 · Item Detector** (vision) | Identify detected item types and look-alikes. | Detected types and identity flags. |
| **PCK-3 · Quantity Counter** (vision) | Count each expected item type. | Per-item observed counts. |
| **PCK-4 · Order Reconciler** (rules) | Compare observed contents with order lines. | Missing, wrong, extra, and quantity discrepancy table. |
| **PCK-5 · Seal Decider** (rules) | Decide whether fulfillment can proceed. | `SEAL`, `STOP & FIX`, or `UNCERTAIN`, with evidence. |

### Returns — 6 specialists

| Specialist | Responsibility | Expected result |
|---|---|---|
| **RTN-1 · Capture Guide** (rules/CV) | Check required return views. | Accepted required shots or retake guidance. |
| **RTN-2 · Identity Verifier** (vision + OCR) | Match returned item identity against the original order and upstream evidence. | PASS / FAIL / UNCERTAIN identity verdict. |
| **RTN-3 · Completeness Checker** (vision) | Verify included components. | Present/missing result per component. |
| **RTN-4 · Condition Grader** (vision) | Assess item and packaging condition. | Condition grade and damage regions. |
| **RTN-5 · Disposition Recommender** (rules) | Apply disposition policy to return findings. | Restock, refurbish, liquidate, or dispose recommendation. |
| **RTN-6 · Evidence & Explanation Builder** (rules) | Explain the decision and compare outbound and returned evidence. | Reasoning, before/after comparison, and evidence links. |

### Recovery — 7 specialists

| Specialist | Responsibility | Expected result |
|---|---|---|
| **RCY-1 · Report Parser** (rules) | Normalize fee-report rows. | Structured charge lines and parse errors. |
| **RCY-2 · Unit Matcher** (rules) | Link charges to a unit, shipment, and organization. | Charge-to-unit references. |
| **RCY-3 · Evidence Retriever** (rules) | Retrieve relevant upstream manager records. | Organization-scoped evidence bundle. |
| **RCY-4 · Duplicate & Reimbursed Detector** (rules) | Detect duplicate or already-paid lines. | Suppression flags and reasons. |
| **RCY-5 · Charge-Evidence Classifier** (rules) | Compare charge claims with the evidence. | `CONTRADICTED`, `SUPPORTED`, `SILENT`, or `UNCERTAIN` position. |
| **RCY-6 · Claim Assembler** (rules) | Assemble eligible charge lines and their provenance. | Claim total, source record references, and hashes. |
| **RCY-7 · Explanation Writer** (rules/template) | Explain each claim and non-claim. | Per-line human-readable rationale. |

### Current implementation boundary

The responsibilities above specify the specialist capability model; they are not a claim that every listed CV/OCR module is already wired into the live path. The current runtime dispatches to five Python handlers under `agents/<stage>/app.py`. Those handlers use structured stage/source records, CSV data, and operator-provided observations to produce deterministic checks. For example, Prep loads the category rule table from `data/prep_requirements.json`, Pack reconciles expected and observed order lines, Returns maps structured condition inputs to dispositions, and Recovery compares normalized fee rows with saved upstream records.

Consequently, image file hashes and evidence references establish traceability, but do not by themselves prove that a vision model analyzed the image. Connecting the capture gate, OCR, and vision responsibilities to a model or vision service requires wiring those components into the running stage handlers and adding integration tests for their outputs. Older or agent-specific code under `agents/<stage>/src/` is not automatically executed merely because it is present in the repository.

## 5. Evidence and workflow state

```text
Unit + route + captures + source data
                │
                ▼
       Orchestrator builds stage input
                │ subject / stage captures / prior evidence / overrides
                ▼
          Stage manager handler
                │ decision + checks + payload + evidence references
                ▼
       Validate and persist stage result
                │
                ├── evaluate next flow condition
                ├── create next stage input with previous evidence
                └── derive workflow status and final outcome
```

The common evidence record carries stage identity, workflow and subject references, verdict, checks, timestamps, model/producer metadata, input references, and stage-specific payload. Stage results are associated with the workflow; later stages receive applicable prior evidence. Recovery can also read saved evidence for the matched unit to evaluate fee lines.

The database layer maintains tables for organizations and users, units, workflows, captures, evidence records and checks, upstream evidence references, source CSV records, charges and recovery claims, and human reviews. `DATABASE_URL` selects PostgreSQL; when it is unset, the API uses `data/cube_unified.db` with SQLite. The separate CLI runner can use the file-based store; it is not the web API's persistence backend.

Human overrides are recorded against the evidence record they supersede. They affect effective workflow decisions without erasing the original result. The database also records human-review activity. Treat the workflow and linked records as the audit trail; do not describe storage as cryptographically immutable unless the persistence implementation enforces that guarantee.

## 6. Status, outcome, and uncertainty

`orchestration/rollup.py` is the authoritative policy. It derives status and final outcome from the applicable stage results and overrides.

| Workflow status | Meaning |
|---|---|
| `PENDING` | No stage has run. |
| `FAILED` | A required stage ended in an error. |
| `RECOVERY_REQUIRED` | A non-recovery stage failed and Recovery has not completed. |
| `BLOCKED` | A human decision is required or the workflow is halted. |
| `IN_PROGRESS` | Applicable stages remain. |
| `COMPLETED` | All applicable stages finished and nothing is waiting for a human decision. |

| Final outcome | Meaning |
|---|---|
| `CLAIM_RECOMMENDED` | Recovery's effective verdict is FAIL (evidence contradicts at least one assessed charge). |
| `EXCEPTION` | A non-recovery stage has an effective FAIL verdict. |
| `INCOMPLETE` | A required stage did not complete. |
| `NEEDS_REVIEW` | A stage explicitly requires a human decision. |
| `CLEAN` | Applicable stage evidence passed with no higher-priority outcome. |

The policy preserves `UNCERTAIN`; a result is not silently promoted to PASS. Flow defaults specify whether to continue or stop on uncertainty or errors, while the rollup reports the resulting workflow state.

## 7. Authentication and organization isolation

- `/auth/login` and `/auth/register` issue bearer sessions; `/auth/me` returns the current account.
- `AUTH_TOKEN_SECRET` is required and must contain at least 32 characters. Tokens have an eight-hour lifetime.
- The API derives the authorized `org_id` from the authenticated token and rejects requests for another organization.
- Dashboard, unit, workflow, source-record, and evidence queries are organization-scoped.
- Fresh local/demo databases receive `org_alpha` / `root` and `org_bravo` / `root` accounts for the two demo organizations. These are convenience credentials only and must be changed or removed before deployment.
- Registration can create a new organization. Registration into an existing team can be restricted by `CUBE_ALPHA_INVITE_CODE` or `CUBE_BRAVO_INVITE_CODE`.

Authentication and tenant isolation should be tested at the API/data-access boundary, not inferred from the frontend's selected view.

## 8. API and frontend surfaces

The unified API in `orchestration/api.py` exposes:

- Authentication: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`.
- Health and metrics: `GET /health`, `GET /metrics`.
- Dashboards: `/dashboard/summary`, `/dashboard/timeseries`, `/dashboard/activity`, `/dashboard/locations`, and `/dashboard/agents/{stage}`.
- Units and workflow: `POST /units`, `GET/POST /workflows`, workflow detail/evidence, and run/resume/override actions.
- Direct stage inspection: `POST /inspect/{receiving|prep|pack|returns|recovery}`.

The React application provides these main views:

| View | Purpose |
|---|---|
| Landing and sign-in | Enter the app, log in, or register an organization/account. |
| Command Center | Tenant-scoped KPI cards, verdict and agent summaries, issue-category resolution rates, lifecycle outcome chart, funnel, and unit ledger. |
| Stage managers | Search/filter units and run Receiving, Prep, Pack, Returns, or Recovery inspections. |
| Unit Passports | Inspect one unit's profile, workflow lifecycle, evidence, and stage outcomes. |
| Review Queue | Inspect unresolved work and record review decisions/overrides. |
| Claims & Analytics | Browse saved operational and recovery outcomes. |
| System Health | Review API/agent availability and application settings. |

Dashboard history is based on persisted workflow and evidence records; selecting a date range only filters the displayed history. A workflow run should remain visible after reload because it is saved in the configured database.

## 9. Failure handling and operational limits

- Agent calls use the flow's timeout/retry settings. In HTTP mode the service health endpoints are checked by the API.
- The orchestrator records stage results and failure state rather than treating a failed call as a successful inspection.
- `resume` retries a workflow from its pending/error work; an operator may first need to resolve an explicit review or correct the underlying service/input.
- Sample CSV import is provided by `scripts/import_sample_csv_to_db.py`; `scripts/verify_db.py` reports the configured database engine and records.
- A populated local SQLite database is a local development/demo artifact, not a shared production database. Use PostgreSQL and an appropriately protected deployment for shared use.
- The current structured-observation handlers do not provide end-to-end automated image understanding. Model-backed CV/OCR capabilities require implementation, credentials where applicable, and verification in the live manager entry point.

## 10. Running locally

Follow the full setup in [`README.md`](README.md). The two main processes are:

```powershell
# API
python -m uvicorn orchestration.api:app --host 127.0.0.1 --port 8100 --reload

# Frontend, in a second terminal
cd frontend
npm run dev
```

For backend integration tests, activate the Python virtual environment and run `python -m pytest`. For the frontend, run `npm run lint` and `npm run build` from `frontend/`.
