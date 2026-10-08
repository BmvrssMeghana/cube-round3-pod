# CUBE Round 3 — Agent & Sub-Agent Architecture

This document details the internal sub-agent pipeline breakdown for each of the five operational managers in the CUBE platform.

---

## 1. Receiving Manager (6 Sub-Agents)
- **Inputs**: Purchase Order (`sku`, `expected_qty`, `variant`, `expected_cartons`), catalogue images, carton/product photos, `org_id`, `unit_id`.
- **Sub-Agents**:
  1. `subagent_capture_gate`: Evaluates photo quality, lighting, and requests retake if obscured.
  2. `subagent_identity_resolver`: Reads SKU/ASIN labels and compares against PO.
  3. `subagent_quantity_counter`: Verifies carton count and units per carton.
  4. `subagent_variant_checker`: Validates item variant (color, size) against PO.
  5. `subagent_damage_inspector`: Identifies crushing, water damage, tears, and missing parts.
  6. `subagent_decision_builder`: Aggregates check verdicts (`PASS`/`FAIL`/`UNCERTAIN`) and drafts supplier shortage/damage claim.

---

## 2. Prep Manager (6 Sub-Agents — FBA Route)
- **Inputs**: Receiving evidence, category prep requirements, post-prep photos, FNSKU info, `org_id`.
- **Sub-Agents**:
  1. `subagent_requirement_resolver`: Loads category prep rules from authoritative database.
  2. `subagent_capture_guide`: Ensures shot checklist completeness (front, label, warning, seal, expiry).
  3. `subagent_polybag_seal`: Inspects polybag presence and heat seal integrity.
  4. `subagent_warning_reader`: Performs OCR for suffocation warning presence, font size, and legibility.
  5. `subagent_label_inspector`: Audits FNSKU label placement, seam/edge overhang, original barcode coverage, and expiry visibility.
  6. `subagent_compliance_decider`: Generates compliance matrix (`PASS`/`FAIL`/`UNCERTAIN`).

---

## 3. Pack Manager (5 Sub-Agents — MFN Route)
- **Inputs**: Order lines (`sku`, `qty`), catalogue reference images, open box photo, `org_id`.
- **Sub-Agents**:
  1. `subagent_capture_gate`: Validates top-down photo quality and item occlusion.
  2. `subagent_item_detector`: Identifies SKU item types in open box via object detection.
  3. `subagent_quantity_counter`: Counts item instances inside package.
  4. `subagent_order_reconciler`: Compares expected vs observed lines (missing, extra, wrong item).
  5. `subagent_seal_decider`: Issues operational decision (`SEAL` vs `STOP & FIX` with actionable instructions).

---

## 4. Returns Manager (6 Sub-Agents — Return Route)
- **Inputs**: Original order, parts list, returned item photos, upstream pack evidence, `org_id`.
- **Sub-Agents**:
  1. `subagent_capture_guide`: Checklists returned item, accessories, packaging, and serial numbers.
  2. `subagent_identity_verifier`: Validates returned item identity against outbound pack evidence.
  3. `subagent_completeness_checker`: Checks presence of all required accessories/parts.
  4. `subagent_condition_grader`: Grades physical item condition on Amazon published condition scale.
  5. `subagent_disposition_recommender`: Applies rule matrix to recommend `RESTOCK`, `REFURBISH`, `LIQUIDATE`, `REJECT`, or `HUMAN_REVIEW`.
  6. `subagent_evidence_builder`: Generates plain-language reasoning and side-by-side comparison.

---

## 5. Recovery Manager (7 Sub-Agents)
- **Inputs**: Platform fee report CSV, all upstream evidence records (`RCV`, `PRP`, `PCK`, `RTN`), past claims, `org_id`.
- **Sub-Agents**:
  1. `subagent_report_parser`: Normalizes charge line items (ID, fee type, SKU, amount, date).
  2. `subagent_unit_matcher`: Links fee lines to physical unit lifecycle records.
  3. `subagent_evidence_retriever`: Fetches org-scoped evidence chain from database.
  4. `subagent_duplicate_detector`: Flags duplicate or previously reimbursed claims.
  5. `subagent_charge_classifier`: Evaluates charge position (`CONTRADICTS`, `SUPPORTS`, `SILENT`, `UNCERTAIN`).
  6. `subagent_claim_assembler`: Compiles claimable total, cited evidence IDs, and image hashes.
  7. `subagent_explanation_writer`: Writes human-readable dispute justification and non-claim explanations.
