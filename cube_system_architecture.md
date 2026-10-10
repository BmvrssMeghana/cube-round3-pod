# CUBE Commerce Operations --- System Architecture

This document presents the integrated CUBE platform and its specialist
workstreams. The first diagram shows the main runtime without
unnecessary implementation detail; the second expands the five managers
into their 30 logical specialists.

## 1. CUBE --- Overall system architecture

``` mermaid
flowchart TB
    U["Seller / Operations User"] --> FE["React + TypeScript + Vite<br/>Operations Console"]
    FE -->|"Bearer Token"| API["FastAPI API<br/>Authentication · Tenant Authorization<br/>Units · Workflows · Dashboard · Reviews"]

    API --> ORCH["Workflow Orchestrator<br/>Routing · Retries · Resume · State"]
    FLOW["orchestration/flow.json<br/>FBA / MFN / Return Conditions"] -.-> ORCH

    ORCH --> RCV["Receiving Manager"]
    ORCH --> PRP["Prep Manager"]
    ORCH --> PCK["Pack Manager"]
    ORCH --> RTN["Returns Manager"]
    ORCH --> RCY["Recovery Manager"]

    RCV & PRP & PCK & RTN & RCY --> EV["Checks · Verdicts · Evidence"]
    EV --> ROLL["Outcome Rollup<br/>Status + Final Outcome"]

    API <--> DB["Database Layer<br/>orchestration/db.py · store.py"]
    ROLL --> DB

    DB --> SQL[("SQLite<br/>Local default")]
    DB --> PG[("PostgreSQL<br/>Configured deployment")]

    DB --> UP["Unit Passport<br/>Evidence Ledger · Review History<br/>Claims · Workflow History"]
    UP --> FE

    classDef frontend fill:#E5EEFF,stroke:#4779C7,color:#18345D;
    classDef orchestration fill:#DDF5E7,stroke:#399568,color:#164B32;
    classDef manager fill:#FFF0D5,stroke:#D49A35,color:#62400A;
    classDef storage fill:#EEE6FF,stroke:#8C6AC4,color:#38265F;

    class FE,API frontend;
    class ORCH,ROLL orchestration;
    class RCV,PRP,PCK,RTN,RCY manager;
    class EV,DB,SQL,PG,UP storage;
```

### Main flow

1.  The seller or operations user works through the React/TypeScript
    console.
2.  FastAPI authenticates requests and enforces organization-level
    access.
3.  The orchestrator evaluates conditional routing from
    `orchestration/flow.json` and invokes the applicable stage managers.
4.  The five managers return structured checks, verdicts, and evidence
    references.
5.  The outcome rollup derives the workflow status and final outcome.
6.  Workflow, unit, evidence, review, source, charge, and claim data are
    persisted through the database layer.
7.  The UI presents persisted data in dashboards, unit passports, review
    history, and claims views.

### Database options

-   **SQLite** is the default for local development
    (`data/cube_unified.db`).
-   **PostgreSQL** is used when `DATABASE_URL` is configured.

### Runtime note

The default manifests execute the five stage handlers in-process.
HTTP-based stage execution is an optional configured mode. The diagram
represents the current five-manager runtime boundary, not 30 separately
deployed services.

## 2. Specialist subagents and responsibilities

The specialists below are logical workstreams within each manager. The
arrows show a conceptual sequence of responsibilities, not a guarantee
that each workstream is currently invoked as an independent module.

``` mermaid
flowchart TB
    subgraph RCV["1. Receiving Manager — 6 Specialists"]
        R1["Capture & Quality Gate<br/>Checks image quality and integrity"]
        R2["Identity Resolver<br/>Matches item identity with purchase order"]
        R3["Quantity Counter<br/>Compares expected and observed quantities"]
        R4["Variant Checker<br/>Checks colour, size and variant"]
        R5["Damage Inspector<br/>Identifies visible damage"]
        R6["Decision & Evidence Builder<br/>Combines checks and records evidence"]
        R1 --> R2 --> R3 --> R4 --> R5 --> R6
    end

    subgraph PRP["2. Prep Manager — 6 Specialists"]
        P1["Requirement Resolver<br/>Selects applicable prep rules"]
        P2["Capture Guide & Gate<br/>Checks required views and image quality"]
        P3["Polybag & Seal Checker<br/>Checks bag presence and seal"]
        P4["Warning Reader<br/>Checks required warning labels"]
        P5["Label & Barcode Inspector<br/>Checks labels, barcodes and expiry"]
        P6["Compliance Decider<br/>Determines prep compliance"]
        P1 --> P2 --> P3 --> P4 --> P5 --> P6
    end

    subgraph PCK["3. Pack Manager — 5 Specialists"]
        K1["Capture Guide & Gate<br/>Checks required package views"]
        K2["Item Detector<br/>Identifies packed item types"]
        K3["Quantity Counter<br/>Counts each item type"]
        K4["Order Reconciler<br/>Finds missing, wrong or extra items"]
        K5["Seal Decider<br/>Decides seal, fix or uncertainty"]
        K1 --> K2 --> K3 --> K4 --> K5
    end

    subgraph RTN["4. Returns Manager — 6 Specialists"]
        T1["Capture Guide<br/>Checks required return images"]
        T2["Identity Verifier<br/>Matches return with original item"]
        T3["Completeness Checker<br/>Checks included components"]
        T4["Condition Grader<br/>Assesses product and packaging condition"]
        T5["Disposition Recommender<br/>Recommends restock, refurbish, liquidate or dispose"]
        T6["Evidence & Explanation Builder<br/>Explains decision using lifecycle evidence"]
        T1 --> T2 --> T3 --> T4 --> T5 --> T6
    end

    subgraph RCY["5. Recovery Manager — 7 Specialists"]
        C1["Report Parser<br/>Structures fee-report rows"]
        C2["Unit Matcher<br/>Links charges to units and shipments"]
        C3["Evidence Retriever<br/>Collects relevant upstream evidence"]
        C4["Duplicate & Reimbursed Detector<br/>Flags duplicate or already-paid charges"]
        C5["Charge-Evidence Classifier<br/>Classifies charges against evidence"]
        C6["Claim Assembler<br/>Builds eligible claims with evidence references"]
        C7["Explanation Writer<br/>Explains claims and non-claims"]
        C1 --> C2 --> C3 --> C4 --> C5 --> C6 --> C7
    end

    classDef receiving fill:#E5EEFF,stroke:#4779C7,color:#18345D;
    classDef prep fill:#DDF5E7,stroke:#399568,color:#164B32;
    classDef pack fill:#FFF0D5,stroke:#D49A35,color:#62400A;
    classDef returns fill:#FFE5E5,stroke:#D65B63,color:#65252B;
    classDef recovery fill:#EEE6FF,stroke:#8C6AC4,color:#38265F;

    class R1,R2,R3,R4,R5,R6 receiving;
    class P1,P2,P3,P4,P5,P6 prep;
    class K1,K2,K3,K4,K5 pack;
    class T1,T2,T3,T4,T5,T6 returns;
    class C1,C2,C3,C4,C5,C6,C7 recovery;
```

## 3. Evidence and workflow state

The orchestrator builds each stage input using the unit, route,
captures, applicable upstream evidence, and overrides. It invokes the
relevant manager, validates and persists the result, evaluates the next
routing condition, and derives the overall workflow outcome.

The orchestrator owns workflow transitions. Individual managers do not
call one another directly and do not independently set the final
workflow outcome.

## 4. Implementation boundary

The specialist responsibilities describe the capability model; they do
not imply that every CV/OCR responsibility is already connected to a
live model. The current runtime calls five Python handlers under
`agents/<stage>/app.py`. These handlers use structured stage/source
records and operator-provided observations to produce checks.
Model-backed image understanding requires explicit integration into the
live handlers and tests that verify the resulting outputs.
