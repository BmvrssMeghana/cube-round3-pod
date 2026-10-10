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
    classDef recovery fill:#EEE6FF,stroke:#8C6AC4,color:#38265E;

    class R1,R2,R3,R4,R5,R6 receiving;
    class P1,P2,P3,P4,P5,P6 prep;
    class K1,K2,K3,K4,K5 pack;
    class T1,T2,T3,T4,T5,T6 returns;
    class C1,C2,C3,C4,C5,C6,C7 recovery;

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
