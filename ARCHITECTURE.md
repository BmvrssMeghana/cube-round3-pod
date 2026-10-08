# Architecture

This document describes the **starter**. At the bottom is a section for **your Pod's architecture**, which you must fill in and which is part of the submission. A submission whose `ARCHITECTURE.md` still only describes the starter has not documented its system.

## 1. The system

```text
                POD
                 │
       ┌─────────▼─────────┐      owns workflow state; derives status and final outcome from the evidence chain
       │    Orchestrator   │      routes · validates · records evidence · retries · handles failures and UNCERTAIN
       └─────────┬─────────┘
                 │  Agent Input ▼          ▲ Agent Output (evidence)
       ┌─────────▼─────────┐
       │     Receiving     │
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │       Prep        │   (FBA units)
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │       Pack        │   (merchant-fulfilled / 3PL units)
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │      Returns      │   (if a return happened)
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │     Recovery      │   reads ALL accumulated evidence
       └─────────┬─────────┘
                 ↓
          Final Outcome        derived by the orchestrator, not copied from any agent

  shared/schemas · shared/contracts · shared/utils      data/input · data/sample · data/expected      examples/
```

The arrows show the *expected commerce journey*. Physically, every hand-off goes through the orchestrator ([`INTEGRATION-GUIDE.md`](INTEGRATION-GUIDE.md) section 1).

## 2. Responsibilities

| Component | Responsible for | Not responsible for |
|---|---|---|
| **Agent** (`agents/<stage>/`) | One stage's judgment, returned as an Agent Output with an Evidence Record. Failing open. Refusing other tenants. | Calling other agents. Setting workflow state. Rewriting earlier evidence. |
| **Orchestrator** (`orchestration/`) | Starting workflows; identifying the current stage; invoking agents with context; validating and recording evidence; updating state; routing; retries; failures; UNCERTAIN; the final outcome. | Making stage judgments. Fabricating or deleting evidence. Turning UNCERTAIN into PASS/FAIL without an explicit rule. |
| **Contract** (`shared/schemas/`) | One strict set of data shapes. | Agent-specific logic (that goes in `payload`). |
| **Stubs** (`agents/*/app.py` as shipped) | Replaying Round 2 CSV rows as valid evidence, so the plumbing can be tested. | Pretending to be agents. |

## 3. Shared data

| Object | Owner | Lives in |
|---|---|---|
| Evidence Record | the agent that produced it (immutable) | the evidence store |
| Workflow State | **the orchestrator** | the workflow store |
| Overrides | the orchestrator records them; a person makes them | Workflow State (`overrides[]`), referencing evidence |
| Final Outcome | **the orchestrator**, derived | Workflow State (`final_outcome`) |
| Captures | the Pod | `data/input/<subject>/<stage>/`, referenced by `sha256` |

## 4. Evidence flow and workflow state

```text
Agent Result → Evidence Record → Orchestrator state transition → Next stage → New evidence → Updated workflow state → Final Outcome
```

- Each stage's evidence is stored and passed to **every later stage** as `previous_evidence`.
- State is `PENDING → IN_PROGRESS → COMPLETED`, or `FAILED` / `BLOCKED` / `RECOVERY_REQUIRED` ([`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) section 5), always derived from the evidence and overrides.
- `transitions[]` is the audit trail.
- A reviewer can walk from the Final Outcome to `contributing_records`, to checks, to `evidence_refs`, to the `sha256` of the exact bytes examined.

## 5. Error handling

Every failure is **recorded and never becomes success**: a degraded evidence record stands in (no checks, UNCERTAIN, the error), the stage is `error`, the workflow `FAILED` with outcome `INCOMPLETE`. Transient failures retry; refusals and invalid output do not; UNCERTAIN is preserved; `resume` retries. Full table: [`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) section 8. Tenancy: `org_id` on every request, record and workflow; a record about another org is rejected as a security event; **your storage must enforce it too**.

## 6. Final outcome

`CLEAN`, `CLAIM_RECOMMENDED`, `EXCEPTION`, `NEEDS_REVIEW` or `INCOMPLETE`, with the reason, the contributing evidence, `needs_human`, and `provisional` (true unless the workflow is `COMPLETED`). Default rules: [`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) section 6.

## 7. What is fixed and what is yours

**Fixed (the contract, strict):**

- The five required agents and their stages (Specialist Pods: four agents plus integration work, see [`FAQ.md`](FAQ.md))
- Common evidence requirements: the Agent Input/Output and Evidence Record shapes; PASS / FAIL / UNCERTAIN; the status vocabularies
- Required traceability: workflow id, agent id, hashes, `upstream_refs`, overrides that reference what they supersede
- An orchestrator that owns workflow state and produces a **Final Outcome**
- Minimum testing, and the submission and evaluation requirements ([`SUBMISSION-GUIDE.md`](SUBMISSION-GUIDE.md), [`ROUND3-RUBRIC.md`](ROUND3-RUBRIC.md))

**Participant-designed (the implementation, flexible):**

- Internal architecture, programming language, frameworks, how each agent is built
- How the orchestrator is implemented (the starter is one option; LangGraph, a queue, a state machine, your own)
- The communication mechanism (in-process, HTTP, queue) as long as the contract holds
- Database, persistence, deployment platform
- UI, review queue, dashboards
- Additional services, additional features
- The final-outcome policy, routing and `on_uncertain` / `on_error` policies (documented in `docs/decisions.md`)

## 8. Extension points

| You want to… | Change |
|---|---|
| Add or reroute a stage | `orchestration/flow.json` (and write a decision) |
| Change the final decision or status rules | `orchestration/rollup.py` (and its tests, and a decision) |
| Plug in a real agent | `agents/<stage>/app.py` + `agent.json` |
| Run an agent as a service in any language | `agent.json` `mode: "http"` + [`agent-api.md`](shared/contracts/agent-api.md) |
| Run your own subjects | `data/input/<subject>/<stage>/` + a cases file |
| Add agent-specific data to evidence | `payload` (never the envelope) |
| Persist to a database | implement the four store methods in `orchestration/store.py` |

## 9. Deployment options (yours)

- **Single process:** `uvicorn orchestration.api:app` with all agents `inproc`. Simplest.
- **Orchestrator + agent services:** each agent its own process, `mode: "http"`, `<STAGE>_URL` set; `GET /health` for readiness.
- Whatever you pick, the demo runs from the submitted commit and any URL works without your accounts. The API ships with **no authentication**: add it before exposing it.

---

## Your Pod's Architecture: EvidenceChain Operations Platform

### 1. System Architecture Diagram

```text
                                UNIFIED FRONTEND (React 18 / Vite / TypeScript)
                                                │
                                                ▼
                                    UNIFIED BACKEND API (FastAPI)
                                                │
                                                ▼
                                     CENTRAL ORCHESTRATOR
                                                │
    ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
    ▼                   ▼                   ▼                   ▼                   ▼
Receiving Manager   Prep Manager        Pack Manager       Returns Manager     Recovery Manager
  (Intake/PO)     (Packaging/Prep)    (Carton Pack)      (Return Grade)      (Financial Dispute)
  [Gemini Vision] [Polybag/OCR Engine][Claude 3.5 Sonnet] [Gemini Vision]     [SLA/Evidence Matcher]
    │                   │                   │                   │                   │
    └───────────────────┴───────────────────┼───────────────────┴───────────────────┘
                                                ▼
                                    IMMUTABLE EVIDENCE STORE
                                                │
                                                ▼
                                     CONTINUOUS UNIT PASSPORT
```

### 2. What Each Agent Really Is (No Stubs)

- **Receiving Manager (`agents/receiving/src/`):** Real multimodal computer vision engine using Google Gemini / OpenAI. Performs PO quantity verification, SKU matching, variant check, carton/unit damage inspection, and component validation. Emits `RCV-<UnitID>` evidence records.
- **Prep Manager (`agents/prep/src/`):** Real automated polybag sealing check, suffocation warning OCR verification, FNSKU label placement evaluation, barcode coverage audit, and physical scale dimension/weight measurement recorder. Emits `PRP-<UnitID>` evidence records.
- **Pack Manager (`agents/pack/src/`):** Real Anthropic Claude 3.5 Sonnet vision engine with 2D bounding box detection algorithm `[ymin, xmin, ymax, xmax]`. Reconciles box contents against order manifests and emits `SEAL` (`PASS`), `STOP_AND_FIX` (`FAIL`), or `MANUAL_REVIEW` (`UNCERTAIN`). Emits `PCK-<UnitID>` evidence records.
- **Returns Manager (`agents/returns/src/`):** Real multimodal LLM visual inspection evaluating returned item identity, component completeness, physical damage grading under Amazon published condition standards, and disposition assignment (`restock`, `refurbish`, `liquidate`, `dispose`). Emits `RTN-<UnitID>` evidence records.
- **Recovery Manager (`agents/recovery/src/`):** Real deterministic SLA calculation engine and evidence lineage matcher. Cross-references fee charge reports against upstream evidence across Receiving, Prep, Pack, and Returns to generate claim recommendations with content SHA-256 hashes. Emits `RCY-<UnitID>` evidence records.

### 3. Orchestrator Architecture

- **State Management:** The Central Orchestrator owns all workflow state (`orchestration/store.py`). Workflow state is stored using `FileStore` (JSON files under `out/workflows/` and `out/evidence/`) with SQLite / PostgreSQL persistence models.
- **Retries & Resilience:** Transient agent timeouts retry up to `retries` limit (configured in `orchestration/flow.json`). Refusals (HTTP 4xx) and invalid tenant requests do not retry and produce degraded error records.
- **Overrides Mechanism:** Human verdict overrides append immutable entries to `overrides[]` in workflow state without mutating or deleting raw AI evidence records (`docs/decisions.md` ADR-03).
- **Idempotency:** Request execution keys use `<workflow_id>:<stage>` to prevent duplicate execution.

### 4. Routing & Final Outcome Logic

- **Dynamic Flow Routing:** Evaluated via `orchestration/flow.json`. Prep runs for FBA orders (`route: ["fba"]`), Pack runs for Merchant-fulfilled orders (`route: ["mfn"]`), and Returns runs when `returned: true`.
- **Outcome Rollup Rules (`orchestration/rollup.py`):**
  - Any stage `FAIL` → `EXCEPTION` (or `CLAIM_RECOMMENDED` if Recovery contradicts a fee charge).
  - Any stage `UNCERTAIN` with `needs_human: true` → workflow status `BLOCKED`, final outcome `NEEDS_REVIEW`.
  - Incomplete required stage → `INCOMPLETE`.
  - All required stages `PASS` → `CLEAN`.
- **Weak Evidence & Uncertainty:** SILENT/UNCERTAIN charges in Recovery are never claimed to prevent seller standing degradation.

### 5. Multi-Tenant Isolation

- **Enforcement:** `org_id` is required on every request header, workflow state object, evidence record, and file path.
- **Storage-Level Security:** File storage paths enforce strict org prefix isolation (`out/workflows/WF-<org_id>-...`). The orchestrator rejects evidence from mismatched tenants with a security event.
- **Testing:** Verified via `tests/integration/test_workflow_state.py` using `org_demo_alpha` and `org_demo_bravo`.

### 6. Failure Model

- **Agent Failure Handling:** When an agent is stopped, times out, or errors out, the orchestrator records a degraded `pending`/`error` evidence record with `verdict: UNCERTAIN` and `needs_human: true`.
- **System Outcome:** The workflow transitions to status `FAILED` with outcome `INCOMPLETE`. It never crashes the orchestrator and never reports false success.
- **Recovery & Resume:** Once the agent service is restored, calling `POST /workflows/{id}/resume` retries the failed stage.

### 7. Deployment

- **Local Execution:**
  ```bash
  # Start unified FastAPI backend server
  python -m uvicorn orchestration.api:app --host 0.0.0.0 --port 8100 --reload

  # Start unified React Vite frontend SPA
  cd frontend && npm run dev
  ```
- **Live URLs:** Frontend available at `http://localhost:5173`, Backend API at `http://localhost:8100`.

### 8. Known Limits

- **Image Capture References:** Media assets in sample data use mock relative paths; full image processing relies on local file references or uploaded base64 data.
- **Rate Limits:** Cloud Vision API calls (Gemini/Claude) require valid API keys set in `.env`; fallback deterministic engines execute locally when offline.

