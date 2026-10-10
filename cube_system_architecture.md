# CUBE Commerce Operations --- System Architecture

## 1. Overall integrated architecture

``` mermaid
flowchart TB
    U["Seller / Operations User"] --> FE["React + TypeScript + Vite<br/>Operations Console"]
    FE -->|"HTTPS / Bearer Token"| API["FastAPI API<br/>Authentication · Tenant Authorization<br/>Dashboard · Units · Workflows · Reviews"]

    API --> ORCH["Workflow Orchestrator<br/>Conditional Routing · Retries · Resume<br/>Stage Handoffs · Workflow State"]
    ORCH --> RCV["Receiving Manager"]
    ORCH --> PRP["Prep Manager"]
    ORCH --> PCK["Pack Manager"]
    ORCH --> RTN["Returns Manager"]
    ORCH --> RCY["Recovery Manager"]

    RCV --> EVID["Structured Stage Results<br/>Checks · Verdicts · Evidence References"]
    PRP --> EVID
    PCK --> EVID
    RTN --> EVID
    RCY --> EVID

    EVID --> ROLL["Outcome Rollup<br/>Workflow Status · Final Outcome"]
    ROLL --> DBL["Persistence Layer<br/>orchestration/db.py · store.py"]
    API <--> DBL

    DBL --> SQLITE[("SQLite<br/>Local / Default")]
    DBL --> PG[("PostgreSQL<br/>When DATABASE_URL is set")]

    DBL --> PASSPORT["Unit Passport · Evidence Ledger<br/>Workflow History · Overrides · Claims"]
    PASSPORT --> FE

    FLOW["orchestration/flow.json<br/>FBA / MFN Routing · Return Conditions"] -. configuration .-> ORCH

    classDef ui fill:#e8f1ff,stroke:#4b83d1,color:#15345c;
    classDef core fill:#e8f7ef,stroke:#36976a,color:#164d35;
    classDef agent fill:#fff2dc,stroke:#d49a35,color:#63420b;
    classDef data fill:#f0eaff,stroke:#8b6bc4,color:#38265f;
    class FE,API ui;
    class ORCH,ROLL core;
    class RCV,PRP,PCK,RTN,RCY agent;
    class DBL,SQLITE,PG,PASSPORT,EVID data;
```

### Main flow

1.  The user operates the React console and signs in.
2.  FastAPI authenticates the request and scopes access to the user's
    organization.
3.  The orchestrator reads the configured flow and invokes the
    applicable stage managers.
4.  Stage managers return structured checks, verdicts, and evidence
    references. The orchestrator records stage results and passes
    applicable upstream evidence to later stages.
5.  The outcome rollup derives the workflow status and final outcome.
6.  The persistence layer stores workflow, unit, evidence, review,
    source-data, charge, and claim records in SQLite or PostgreSQL.
7.  The console presents the saved data through dashboards, unit
    passports, review queue, and claims views.

**Runtime note:** The default manifests use in-process stage handlers.
HTTP-based stage execution is an optional configured mode. The diagram
does not imply that every specialist CV/OCR capability is already
connected to a live model.

## 2. Specialist workstreams inside the five managers

These are logical capabilities coordinated within each manager---not 30
separately deployed agents.

``` mermaid
flowchart TB
    subgraph RCV["Receiving Manager · 6 workstreams"]
      R1["Capture & Quality Gate"] --> R2["Identity Resolver"] --> R3["Quantity Counter"]
      R3 --> R4["Variant Checker"] --> R5["Damage Inspector"] --> R6["Decision & Evidence Builder"]
    end
    subgraph PRP["Prep Manager · 6 workstreams"]
      P1["Requirement Resolver"] --> P2["Capture Guide & Gate"] --> P3["Polybag & Seal Checker"]
      P3 --> P4["Warning Reader"] --> P5["Label & Barcode Inspector"] --> P6["Compliance Decider"]
    end
    subgraph PCK["Pack Manager · 5 workstreams"]
      K1["Capture Guide & Gate"] --> K2["Item Detector"] --> K3["Quantity Counter"]
      K3 --> K4["Order Reconciler"] --> K5["Seal Decider"]
    end
    subgraph RTN["Returns Manager · 6 workstreams"]
      T1["Capture Guide"] --> T2["Identity Verifier"] --> T3["Completeness Checker"]
      T3 --> T4["Condition Grader"] --> T5["Disposition Recommender"] --> T6["Evidence & Explanation Builder"]
    end
    subgraph RCY["Recovery Manager · 7 workstreams"]
      C1["Report Parser"] --> C2["Unit Matcher"] --> C3["Evidence Retriever"]
      C3 --> C4["Duplicate & Reimbursed Detector"] --> C5["Charge-Evidence Classifier"]
      C5 --> C6["Claim Assembler"] --> C7["Explanation Writer"]
    end
```

### Manager counts

  Stage manager     Workstreams
  --------------- -------------
  Receiving                   6
  Prep                        6
  Pack                        5
  Returns                     6
  Recovery                    7
  **Total**              **30**

## 3. Data and evidence layer

The database layer persists: - Organizations and users - Units and
workflows - Captures, evidence records, checks, and upstream evidence
references - Imported source CSV records - Charges and recovery claims -
Human reviews and overrides

`DATABASE_URL` selects PostgreSQL. If unset, the API uses
`data/cube_unified.db` with SQLite. The orchestrator owns workflow
transitions; individual stage managers do not call one another or set
the final workflow outcome.

## 4. Important implementation boundary

The five stage handlers are the currently wired runtime boundary. The
specialist labels describe intended responsibilities; the presence of a
CV/OCR workstream does not mean a live vision or OCR model is invoked
for every check. Current handlers make decisions using structured
source/stage records and operator-provided observations. Model-backed
image understanding requires explicit integration and tests.
