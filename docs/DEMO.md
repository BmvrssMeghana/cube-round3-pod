# CUBE Round 3 — Demo & Walkthrough Guide

---

## 1. Quick Start Guide

### Step 1: Run Backend Server
```bash
python -m uvicorn orchestration.api:app --port 8100 --reload
```

### Step 2: Launch Frontend Application
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Deterministic Demo Scenarios

The platform includes 4 built-in deterministic demo scenarios to demonstrate all capabilities without requiring live API keys:

1. **Happy Path (`UNIT-001`):**
   - Receiving PASS -> Prep PASS -> Pack PASS -> COMPLETED.
   - Demonstrates smooth end-to-end automated compliance across the pipeline.

2. **Exception Path (`UNIT-002`):**
   - Receiving PASS -> Prep FAIL (Polybag warning obscured) -> HALTED.
   - Demonstrates Human-in-the-Loop review queue, inspector override modal, and audit trail logging.

3. **Return + Financial Recovery (`UNIT-003` / `UNIT-0014`):**
   - Receiving PASS -> Prep PASS -> Pack PASS -> Returns PASS (Restocked) -> Recovery CLAIM ($45.00 dispute).
   - Demonstrates cross-agent intelligence: Recovery engine identifies that Amazon charged an "item not returned" fee despite Returns logs proving item was restocked.

4. **Cross-Stage Contradiction (`UNIT-004`):**
   - Receiving Undamaged -> Returns Damaged -> DEGRADED / Cross-Stage Conflict Flag.
   - Demonstrates cross-stage conflict detection highlighting carrier or FC damage anomalies.
