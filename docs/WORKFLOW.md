# CUBE Round 3 — Workflow & Conditional Routing Document

**Workflow Engine:** Declarative JSON Flow Router (`orchestration/flow.json`)  

---

## 1. Flow Definition & Stage Routing Rules

The central orchestrator evaluates routing conditions dynamically before invoking stages.

```json
{
  "flow_id": "standard-fba-mfn",
  "defaults": {
    "timeout_s": 30,
    "retries": 1,
    "on_uncertain": "block",
    "on_error": "continue"
  },
  "steps": [
    { "stage": "receiving", "when": {} },
    { "stage": "prep", "when": { "route": ["fba"] } },
    { "stage": "pack", "when": { "route": ["mfn"] } },
    { "stage": "returns", "when": { "returned": [true] } },
    { "stage": "recovery", "when": {} }
  ]
}
```

### Conditional Routing Rules:
- **Receiving:** Runs for all incoming purchase orders / inbound shipments.
- **Prep:** Runs only when `route == "fba"` (Amazon FBA fulfillment require preparation, polybagging, labeling).
- **Pack:** Runs only when `route == "mfn"` (Merchant-fulfilled / 3PL orders packed in warehouse).
- **Returns:** Runs only when `returned == true` (Customer or carrier returned unit).
- **Recovery:** Runs for all units with billed fees or dispute charges.

---

## 2. Verdict Handling & Escalation Matrix

| Stage Verdict | Default Workflow Action | Next Stage Behavior |
| :--- | :--- | :--- |
| **PASS** | Auto-advance | Proceeds to next routed stage |
| **FAIL** | Record exception | Advances or halts based on `on_error` policy; flags recovery opportunity |
| **UNCERTAIN** | Escalate to Human Review | Halts workflow if `needs_human=true` and `on_uncertain=block`; requires reviewer override |
