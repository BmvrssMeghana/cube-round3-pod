# CUBE Round 3 — Platform Architecture Document

**System Name:** Unified Commerce Operations Platform  
**Target Root:** `cube-round3-pod`  

---

## 1. High-Level System Architecture

The CUBE Round 3 platform integrates five specialized AI operational agents into **one continuous SaaS operating system**.

```text
                                UNIFIED FRONTEND (React / Vite)
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
    │                   │                   │                   │                   │
    └───────────────────┴───────────────────┼───────────────────┴───────────────────┘
                                                ▼
                                    IMMUTABLE EVIDENCE STORE
                                                │
                                                ▼
                                    CONTINUOUS UNIT PASSPORT
```

---

## 2. Core Operational Flow & Stage Hand-off

```text
User / API
   │
   ▼
[Receiving Manager] ── PASS ──► [Prep Manager] ── PASS ──► [Pack Manager] ── PASS ──► [Shipment]
        │                             │                         │                         │
      FAIL                          FAIL                      FAIL                     Returned?
        │                             │                         │                         │
        ▼                             ▼                         ▼                         ▼
 [Human Review]                [Human Review]            [Human Review]           [Returns Manager]
                                                                                          │
                                                                                          ▼
                                                                                 [Recovery Manager]
                                                                                          │
                                                                                          ▼
                                                                                 [Financial Claim $]
```

### Stage Responsibilities & Evidence Handoff:

1. **Receiving Manager (RCV):** Performs purchase order item matching, quantity verification, carton/unit damage inspection, and variant verification. Generates `RCV-<UnitID>` evidence.
2. **Prep Manager (PRP):** Evaluates polybag sealing, suffocation warning legibility, FNSKU label placement, barcode coverage, expiry date legibility, and physical scale measurements. Generates `PRP-<UnitID>` evidence.
3. **Pack Manager (PCK):** Analyzes overhead carton photographs using 2D bounding boxes, reconciles contents against expected customer orders, and makes `SEAL`, `STOP_AND_FIX`, or `MANUAL_REVIEW` decisions. Generates `PCK-<UnitID>` evidence.
4. **Returns Manager (RTN):** Inspects customer returns, verifies item identity, checks completeness, grades physical condition under Amazon standards, and assigns disposition (`restock`, `refurbish`, `liquidate`, `dispose`). Generates `RTN-<UnitID>` evidence.
5. **Recovery Manager (RCY):** Reasons over upstream evidence records across Receiving, Prep, Pack, and Returns. Identifies invalid platform/carrier fee charges, evaluates dispute filing windows via the SLA Engine, and produces financial claim recommendations with tamper-evident SHA-256 hashes. Generates `RCY-<UnitID>` evidence.

---

## 3. Technology Stack & Directory Structure

- **Frontend:** React 18, Vite, TypeScript, Manrope typography, custom dark-mode glassmorphic design system.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, JSONSchema validation, SQLite / FileStore persistence.
- **AI/ML Engines:** Multimodal Vision SDKs (Google Gemini 2.0 Flash, Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o), deterministic rule engines, SLA calculation engine.

---

## 4. Key Security & Data Integrity Patterns

1. **Content-Addressed Evidence Records:** Every evidence record is signed with SHA-256 hash of its body content.
2. **Monotonic Audit Trail:** Verdict overrides never overwrite raw AI evidence; overrides append immutable audit records.
3. **Fail-Open Degraded State:** Unavailable agents record pending error records without crashing the orchestration pipeline.
