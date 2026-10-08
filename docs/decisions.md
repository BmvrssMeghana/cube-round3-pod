# CUBE Round 3 — Architectural Decisions Record (ADR)

---

## ADR-01: Single Integrated Project Architecture (`cube-round3-pod`)
- **Context:** The five agents (Receiving, Prep, Pack, Returns, Recovery) were developed independently in separate folders/repositories.
- **Decision:** Consolidate all five agents into one single unified application directory `cube-round3-pod` with `frontend/`, `backend/`, `shared/`, `tests/`, and `docs/`.
- **Rationale:** Prevents fragmented sibling apps, provides one SaaS user experience, and simplifies deployment and continuous integration.

## ADR-02: Continuous Digital Unit Passport Model
- **Context:** Individual agents need a common identifier to connect physical units across their lifecycle.
- **Decision:** Standardize on `UNIT-XXXX` continuous Unit Passport identity linked across `org_id`, `workflow_id`, `subject_id`, and `unit_id`.
- **Rationale:** Enables complete traceability from intake receiving through prep, packing, returns, and financial recovery dispute filing.

## ADR-03: Immutable Content-Addressed Evidence Chain
- **Context:** Downstream agents (Recovery) and human reviewers need tamper-evident proof of operational decisions.
- **Decision:** Every stage outputs an Evidence Record sealed with SHA-256 hash. Overrides append audit trail records without deleting or altering raw evidence.
- **Rationale:** Provides court/platform-grade auditability for fee recovery disputes.

## ADR-04: Centralized Orchestrator over Direct Agent-to-Agent Mesh
- **Context:** Agents calling each other directly creates circular dependencies and tight coupling.
- **Decision:** Agents never call each other. The orchestrator receives agent outputs, stores evidence, updates workflow state, and passes `previous_evidence` to downstream agents.
- **Rationale:** Ensures clean separation of concerns, testability, and fail-open resilience.
