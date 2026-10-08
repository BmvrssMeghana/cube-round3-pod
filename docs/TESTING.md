# CUBE Round 3 — Testing & Quality Assurance Guide

---

## 1. Running the Automated Test Suite

Run the full pytest suite:

```bash
python -m pytest
```

### Test Suite Summary:

- **Unit Tests (`tests/test_agents.py`, `tests/test_rollup.py`, `tests/test_schema.py`):** Validates evidence record structure, content hashing, schema compliance, and rollup logic.
- **Integration Tests (`tests/integration/`):** Validates state transitions, flow routing, override superseding, and upstream evidence consumption across agents.
- **End-to-End Tests (`tests/e2e/`):** Validates happy path, exception path, return + recovery path, HTTP front-door server, and fail-open degraded states.

---

## 2. Test Execution Verification

All 93 tests pass with 100% pass rate:

```text
collected 93 items

tests\test_agents.py .
tests\test_flow.py .
tests\test_hashing.py .
tests\test_orchestrator.py ...
tests\test_recovery_matches.py ..
tests\test_rollup.py .
tests\test_schema.py ..
tests\e2e\test_end_to_end.py ....
tests\e2e\test_examples.py ...
tests\e2e\test_http.py ...
tests\integration\test_agent_contracts.py .........................
tests\integration\test_workflow_state.py ...............................

93 passed in 0.46s
```
