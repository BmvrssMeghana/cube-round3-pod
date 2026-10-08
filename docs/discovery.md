# CUBE Round 3 — Read-Only Discovery Report (Gate 0)

This discovery report analyzes the 5 source agent implementations and details their language, frameworks, model calling patterns, input/output schemas, existing UI/DB, dependencies, tests, and integration gaps.

---

## 1. Receiving Manager (`origin/sahana/receivingManager`)

- **Language / Framework**: Python 3.11+ / FastAPI
- **Entry Point**: `backend/app/main.py` (`POST /api/v1/inspections/run`) and `agents/receiving/app.py`
- **Model Call Mechanism**:
  - **Provider**: Google Gemini (`gemini-2.0-flash`) or OpenAI Vision
  - **Prompt Location**: `backend/app/services/vision.py` (`SYSTEM_PROMPT`)
- **Input Format**: JSON request containing `subject` (PO number, SKU, quantity ordered, cartons ordered) and image links/base64 files.
- **Output Format**: Standardized `InspectionCheck` list, visual observations, confidence score, and decision (`PASS`, `EXCEPTION`, `UNCERTAIN`).
- **Existing UI**: None (pure REST backend).
- **Existing DB / Storage**: Local JSON file store & SQLite repository (`backend/app/database/repository.py`).
- **Dependencies**: `fastapi`, `pydantic`, `httpx`, `google-generativeai`.
- **Tests**: `backend/tests/test_backend.py`.
- **Gap to `handle(agent_input) -> agent_output`**: Bridge PO dictionary lookup to accept dynamic custom inputs and map `InspectionCheck` objects to `shared/schemas/evidence.schema.json`.

---

## 2. Prep Manager (`origin/meghana/prepManager`)

- **Language / Framework**: TypeScript (Node.js / Express backend, Vite React frontend) & Python agent entry.
- **Entry Point**: `backend/src/index.ts` and `agents/prep/app.py`.
- **Model Call Mechanism**:
  - **Provider**: Local computer vision rule engine + OCR scanner
  - **Prompt Location**: `frontend/src/engine/vision.ts` and `frontend/src/data/rules.ts`
- **Input Format**: Work order ID, SKU, FNSKU, category prep requirements, post-prep images.
- **Output Format**: Per-rule compliance matrix (`polybag_sealed`, `suffocation_warning`, `fnsku_label_placement`, `barcode_covered`, `expiry_legible`, `scale_measurements`).
- **Existing UI**: Standalone React Vite App (`frontend/src/pages/Dashboard.tsx`, `NewInspection.tsx`).
- **Existing DB / Storage**: PostgreSQL pool schema (`backend/src/db/schema.sql`, `pool.ts`).
- **Dependencies**: `pg`, `express`, `cors`, `typescript`, `vite`.
- **Tests**: Unit tests in `frontend/src/engine/vision.test.ts`.
- **Gap to `handle(agent_input) -> agent_output`**: Normalize rule checks into standard `checks[]` array and output compliant evidence contract.

---

## 3. Pack Manager (`origin/gracy/packManager`)

- **Language / Framework**: TypeScript (Turborepo workspace with `apps/api`, `apps/web`, `apps/worker`, `packages/domain`, `packages/vision`) & Python wrapper (`pack_manager_agent.py`).
- **Entry Point**: `apps/api/src/index.ts` and `agents/pack/app.py`.
- **Model Call Mechanism**:
  - **Provider**: Anthropic Claude (`claude-3-5-sonnet`) / OpenAI / Gemini vision providers
  - **Prompt Location**: `pack_manager_system_prompt.md` and `packages/vision/src/providers/`
- **Input Format**: Order manifest lines (expected SKUs and quantities) and top-down package image.
- **Output Format**: Item reconciliation result (`missing`, `extra`, `wrong_qty`), bounding box coordinates, and operational verdict (`SEAL` vs `STOP_AND_FIX`).
- **Existing UI**: Standalone React Dashboard (`apps/web/src/pages/QCQueuePage.tsx`, `UploadVerifyPage.tsx`).
- **Existing DB / Storage**: Drizzle ORM schema with PostgreSQL (`packages/database/src/schema.ts`).
- **Dependencies**: `@anthropic-ai/sdk`, `openai`, `@google/genai`, `drizzle-orm`.
- **Tests**: `packages/domain/test/domain.test.ts` and `packages/vision/test/vision.test.ts`.
- **Gap to `handle(agent_input) -> agent_output`**: Standardize `SEAL`/`STOP_AND_FIX` into `PASS`/`FAIL` verdict and populate evidence checks.

---

## 4. Returns Manager (`origin/prasad/returnManager`)

- **Language / Framework**: Python (FastAPI backend) & React TypeScript (`ai-return-manager`).
- **Entry Point**: `backend/main.py` and `agents/returns/app.py`.
- **Model Call Mechanism**:
  - **Provider**: Multi-provider support (`openai`, `anthropic`, `gemini`, `openrouter`)
  - **Prompt Location**: `backend/ai.py` (`INSPECTION_PROMPT`)
- **Input Format**: Returned product photos, customer return reason, original order item parameters.
- **Output Format**: Product match status, damage breakdown, missing parts checklist, Amazon condition grade (`factory_sealed`, `like_new`, `damaged`), and disposition recommendation (`RESTOCK`, `REFURBISH`, `LIQUIDATE`, `REJECT`).
- **Existing UI**: Full customer & inspector webapp (`ai-return-manager/src/pages/returns/InspectReturnPage.tsx`).
- **Existing DB / Storage**: SQLite database (`backend/database.py`).
- **Dependencies**: `openai`, `anthropic`, `fastapi`, `uvicorn`, `pydantic`.
- **Tests**: `backend/tests/` integration endpoints.
- **Gap to `handle(agent_input) -> agent_output`**: Bridge return disposition to standard outcome and emit upstream evidence references.

---

## 5. Recovery Manager (`cube26-rcy-0028-bmvrssmeghana`)

- **Language / Framework**: Python 3.11+ / FastAPI
- **Entry Point**: `recovery_manager/api/app.py` and `agents/recovery/app.py`
- **Model Call Mechanism**:
  - **Provider**: Monotonic deterministic decision classifier + SLA window engine
  - **Prompt Location**: `recovery_manager/engine/classifier.py` and `sla_engine.py`
- **Input Format**: Platform fee report CSV lines and upstream evidence bundles (`RCV`, `PRP`, `PCK`, `RTN`).
- **Output Format**: Charge classification (`CONTRADICTS`, `SUPPORTS`, `SILENT`), claimable USD total, cited evidence IDs, and formal dispute letter snippet.
- **Existing UI**: Single-page AUDIX dashboard (`recovery_manager/ui/index.html`).
- **Existing DB / Storage**: SQLite database (`recovery_manager/db/database.py`).
- **Dependencies**: `fastapi`, `pandas`, `pydantic`.
- **Tests**: `eval/run_eval.py` evaluation script.
- **Gap to `handle(agent_input) -> agent_output`**: Consume preceding evidence records from orchestrator request context and map outcomes to final recovery verdict.

---

## Proposed System Plan & Architectural Adjustments

1. **Unified Front-End SPA (`webapp/`)**:
   - Built with React + Vite using the **Manrope typography system**.
   - Primary theme: High-contrast, clean **Light Theme** by default, with dynamic toggle to **Sleek Dark Theme**.
   - Features: Homepage pipeline stepper, KPI cards, 5 live Agent Dashboards (webcam & file upload quality gates), Unit Detail visual timeline, Evidence Trace view, Review Queue for UNCERTAIN/BLOCKED items, Claims & Loss Prevention dashboard.

2. **Centralized Production Database Layer**:
   - Single PostgreSQL / SQLite schema containing `organizations`, `users`, `units`, `workflows`, `stage_runs`, `evidence_records`, `checks`, `charges`, `claims`, `overrides`, and `audit_logs`.
   - Enforces `org_id` multi-tenant isolation across storage and orchestrator.

3. **Sub-Agent Pipeline Architecture**:
   - Each agent encapsulates 5-7 dedicated sub-agents emitting granular check results into `checks[]`.
