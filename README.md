# CUBE Commerce Operations

CUBE is a multi-tenant operations platform for tracking a commerce unit from receiving through preparation, packing, returns, and financial recovery. A single unit passport brings together workflow status, stage decisions, review history, source data, and linked evidence.

The project combines a React/TypeScript operations console, a FastAPI orchestration API, five stage managers, and SQLite or PostgreSQL persistence. The workflow and agent configuration live in `orchestration/` and `agents/`.

## What it does

- **Sign-in and organization setup:** log into Team Alpha or Team Bravo, register into an existing team with its invite code, or create a new organization. Data access is scoped to the signed-in organization.
- **Unit lifecycle:** create and find units, run individual stage inspections or a full workflow, resume a workflow, and inspect saved results.
- **Unit passports and evidence ledger:** see the lifecycle timeline, stage checks and verdicts, evidence references, source records, overrides, and the final workflow outcome.
- **Operations dashboards:** Command Center KPIs, agent performance, stage funnel, issue categories and resolution rates, lifecycle outcomes, and a searchable unit ledger.
- **Human review:** inspect exceptions, apply an explicitly attributed verdict override, and retain the original stage evidence and override history.
- **Claims and analytics:** review fee lines, charge positions, linked upstream evidence, claim recommendations, and saved workflow history.
- **Sample-data import:** load Receiving, Prep, Pack, Returns, and fee-report CSV records into the configured database while preserving source rows for traceability.
- **Light and dark themes** across the signed-in operations experience.

## Workflow

The default standard flow is configured in [`orchestration/flow.json`](orchestration/flow.json):

1. **Receiving** checks purchase-order identity, carton and unit counts, quantity, damage, quality flags, and variant observations.
2. **Prep** runs when the unit's route is FBA. It evaluates the applicable category rules, visually-checkable rule inputs, labels, seals, warnings, and measurements.
3. **Pack** runs for the configured FBA and MFN routes. It reconciles ordered and observed item lines, quantities, extras, and identity evidence before returning a seal decision.
4. **Returns** runs only when the unit is marked as returned. It checks identity and completeness and maps observed condition to a disposition.
5. **Recovery** evaluates fee-report lines against available upstream evidence, suppresses duplicate or previously reimbursed lines, and produces a claim recommendation and explanation.

The orchestrator evaluates route and return conditions from the flow file. Skipped stages are recorded as skipped and do not count as unfinished required work.

## Specialist responsibilities

The stage managers are organized into the following specialist workstreams. Their detailed responsibility map is in [`docs/agent-design.md`](docs/agent-design.md); the runtime boundary and implementation status are documented in [`ARCHITECTURE.md`](ARCHITECTURE.md).

| Stage manager | Specialist workstreams |
|---|---:|
| Receiving | 6 |
| Prep | 6 |
| Pack | 5 |
| Returns | 6 |
| Recovery | 7 |
| **Total** | **30** |

These are functional responsibilities within five stage managers, **not 30 separately deployed services**. In the currently wired runtime, the orchestrator calls one `handle()` entry point per stage. Those handlers make decisions from structured imported records and operator-provided observations; the CV/OCR workstream labels describe the intended specialist responsibilities and do not mean that a live vision/OCR model is invoked for every check.

## Local setup

Requires Python 3.11 or newer and Node.js/npm. Use two terminals from the repository root.

### 1. Python API

PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Set `AUTH_TOKEN_SECRET` in `.env` to a private random value with at least 32 characters before starting the API. If `DATABASE_URL` is blank, the API uses `data/cube_unified.db` (SQLite). Set it to a PostgreSQL connection string to use PostgreSQL instead.

Optionally import the supplied CSV records into the selected database:

```powershell
python scripts/import_sample_csv_to_db.py
python scripts/verify_db.py
```

Start the API:

```powershell
python -m uvicorn orchestration.api:app --host 127.0.0.1 --port 8100 --reload
```

### 2. Frontend

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API health endpoint is `http://127.0.0.1:8100/health`.

### Demo accounts

On a fresh database, the API seeds `org_alpha` / `root` and `org_bravo` / `root`, scoped to Team Alpha and Team Bravo respectively. These are local/demo credentials only: set a strong `AUTH_TOKEN_SECRET`, change or remove the demo accounts before deployment, and do not reuse their passwords. New organizations can be registered through the sign-in flow. Joining an existing team requires its invite code when configured.

## Configuration

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Purpose |
|---|---|
| `AUTH_TOKEN_SECRET` | Required signing secret for bearer sessions (at least 32 characters). |
| `DATABASE_URL` | PostgreSQL connection string; blank selects the local SQLite database. |
| `CUBE_ALPHA_INVITE_CODE`, `CUBE_BRAVO_INVITE_CODE` | Optional invite codes for registration into the corresponding existing team. |
| `ORCH_FLOW` | Optional path to a workflow flow JSON file. Defaults to the flow selected in `pod.json`. |
| `ORCH_MODE` | Optional `inproc` or `http` override for stage-agent execution. |
| `RECEIVING_URL`, `PREP_URL`, `PACK_URL`, `RETURNS_URL`, `RECOVERY_URL` | Agent URLs when the corresponding manifest uses HTTP mode. |
| `INPUT_DIR`, `DATA_DIR` | Capture directory and sample CSV directory overrides. |
| `LOG_LEVEL`, `LOG_FORMAT` | API and orchestration logging controls. |

The current agent manifests default to in-process execution. Separate stage HTTP services are available through the agent service entry points when configured; they are not required for the default local setup.

## API overview

Public health, authentication, and API documentation routes:

- `GET /health`, `POST /auth/login`, `POST /auth/register`, `/docs`, `/openapi.json`, `/redoc`

Authenticated API routes include:

- `GET /auth/me`
- `GET /dashboard/summary`, `/dashboard/activity`, `/dashboard/timeseries`, `/dashboard/locations`, and `/dashboard/agents/{stage}`
- `GET /workflows`, `POST /workflows`, `GET /workflows/{workflow_id}`, and `GET /workflows/{workflow_id}/evidence`
- `POST /workflows/{workflow_id}/run`, `/resume`, and `/overrides`
- `POST /units`
- `POST /inspect/{receiving|prep|pack|returns|recovery}`

Interactive API documentation is available at `/docs`. Except for health and authentication endpoints, API requests require a bearer token, and organization-scoped data is restricted to the token's organization.

## Tests and checks

From the repository root, with the virtual environment activated:

```powershell
python -m pytest
```

Frontend checks:

```powershell
cd frontend
npm run lint
npm run build
```

## Project map

```text
agents/                  Five stage handlers, manifests, and agent-specific code
data/sample/              Synthetic CSV source data and sample cases
data/input/               Per-unit, per-stage capture files
docs/agent-design.md      Specialist responsibilities by stage manager
frontend/                 React, TypeScript, and Vite operations console
orchestration/api.py      Authenticated FastAPI application and HTTP routes
orchestration/flow.json   Standard conditional stage sequence
orchestration/orchestrator.py
                          Workflow execution and stage hand-offs
orchestration/rollup.py   Workflow status and final-outcome derivation
orchestration/db.py       SQLite/PostgreSQL persistence and data access
shared/                   Evidence contracts, record builders, and utilities
tests/                    Integration and end-to-end tests
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for component boundaries, evidence flow, persistence, routing, and current runtime limitations.
