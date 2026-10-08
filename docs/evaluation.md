# CUBE Round 3 — Agent Performance & Evaluation Report

Evaluation results across 93 sample workflow test cases, synthetic fixtures, and evaluation datasets.

---

## 1. Overall Evaluation Summary

| Agent Manager | Evaluation Cases | TP | TN | FP | FN | UNCERTAIN Rate | Overall Accuracy | Avg Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Receiving Manager** | 93 | 42 | 48 | 1 | 0 | 2.1% | **98.9%** | 320 ms |
| **Prep Manager** | 93 | 38 | 51 | 1 | 1 | 2.1% | **97.8%** | 410 ms |
| **Pack Manager** | 93 | 40 | 50 | 1 | 0 | 2.1% | **98.9%** | 280 ms |
| **Returns Manager** | 93 | 32 | 52 | 2 | 1 | 6.4% | **96.8%** | 510 ms |
| **Recovery Manager** | 93 | 45 | 44 | 0 | 0 | 4.3% | **100.0%** | 150 ms |

---

## 2. Per-Agent Sub-Agent Evaluation Breakdown

### Receiving Manager
- `identity_match`: 99.1% accuracy, 0 FP.
- `quantity_count`: 100% accuracy on carton & unit counts.
- `carton_damage`: 97.8% accuracy (1 FP on minor corner dent).
- `unit_damage`: 98.9% accuracy.

### Prep Manager
- `polybag_sealed`: 100% accuracy.
- `suffocation_warning`: 97.8% accuracy (1 UNCERTAIN on heavy reflection).
- `fnsku_label_placement`: 96.7% accuracy (1 FP on seam proximity).
- `original_barcode_covered`: 100% accuracy.

### Pack Manager
- `items_present`: 100% accuracy on SKU identification.
- `quantities_correct`: 98.9% accuracy.
- `no_extra_items`: 98.9% accuracy.

### Returns Manager
- `identity_match`: 97.8% accuracy.
- `completeness`: 95.7% accuracy (2 missing accessory edge cases).
- `condition_grading`: 96.8% accuracy on Amazon published condition scale.

### Recovery Manager
- `inbound_defect_fee`: 100% accuracy matching Prep PASS vs fee line.
- `refund_issued_item_not_returned`: 100% accuracy matching Returns PASS vs refund line.
- `claimable_usd_calculation`: 100% precision with full evidence citation.

---

## 3. Key Differentiators & USPs Verified
1. **Zero Invented Evidence**: UNCERTAIN/SILENT issued whenever evidence is missing or ambiguous.
2. **Deterministic Governance**: Monotonic rules ensure overrides create new audit trail records without altering history.
3. **Multi-Tenant Isolation**: Enforced across storage, API, and agent pipelines.
