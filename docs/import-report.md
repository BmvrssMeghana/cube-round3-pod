# CUBE Round 3 — Agent Source Code Import & Provenance Report

## Provenance and Code Import Table

| Agent | Source Repository / Branch | Commit SHA | Files Copied | Lines of Code | Still Stubbed? | Contract-Compliant? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Receiving Manager** | `cube-round3-pod` (`origin/sahana/receivingManager`) | `d779fc2b67f19460aadfbc4dda795ef6fa1c5044` | 8 files (`vision.py`, `decision_engine.py`, `inspections.py`, `models/*`, `DECISION_LOGIC.md`) | ~850 LOC | No (REAL) | Yes | Full PO matching, carton damage, unit damage, and vision engine logic imported into `agents/receiving/src/`. |
| **Prep Manager** | `cube-round3-pod` (`origin/meghana/prepManager`) | `a97b879e9ff91588688e5342fdf4766406185a74` | 12 files (`schema.sql`, `inspections.ts`, `vision.ts`, `rules.ts`) | ~920 LOC | No (REAL) | Yes | Polybag seal, suffocation warning OCR, FNSKU placement, and dimensional scale measurements imported into `agents/prep/src/`. |
| **Pack Manager** | `cube-round3-pod` (`origin/gracy/packManager`) | `642d83561742c849216f645700987cec8a7f64cc` | 24 files (`domain/*`, `vision/*`, `database/*`, `pack_manager_agent.py`) | ~1,450 LOC | No (REAL) | Yes | 2D box contents reconciliation, SKU matcher, and seal decision engine imported into `agents/pack/src/`. |
| **Returns Manager** | `cube-round3-pod` (`origin/prasad/returnManager`) | `0217191eec7761c450c31e8c53d7330d6026767a` | 18 files (`agent.py`, `ai.py`, `tools.py`, `models.py`, `ai-return-manager/*`) | ~1,100 LOC | No (REAL) | Yes | Multimodal vision LLM inspection, damage classification, and disposition recommender imported into `agents/returns/src/`. |
| **Recovery Manager** | `cube26-rcy-0028-bmvrssmeghana` (`main`) | `d06ea49af1647890c901698fef00fc96ee4cccf3` | 28 files (`classifier.py`, `evidence_matcher.py`, `sla_engine.py`, `ingestor.py`) | ~1,680 LOC | No (REAL) | Yes | Upstream evidence lineage matcher, fee report parser, position classifier, and claim recommendation engine imported into `agents/recovery/src/`. |

---

## Imported Code Summary

1. **Receiving**: Located in `agents/receiving/src/`. Implements PO line checks, carton damage detection, and vision observations.
2. **Prep**: Located in `agents/prep/src/`. Implements authoritative rule loading, polybag sealing checks, suffocation warning legibility, FNSKU placement, and weight/dimensional measurements.
3. **Pack**: Located in `agents/pack/src/`. Implements outbound order item reconciliation, SKU matcher, and seal vs stop-and-fix guidance.
4. **Returns**: Located in `agents/returns/src/`. Implements returned item identity verification, parts completeness inspection, condition grading, and disposition rules.
5. **Recovery**: Located in `agents/recovery/src/`. Implements fee charge line parsing, SLA dispute window checking, cross-stage evidence matching, position classification (`CONTRADICTS`, `SUPPORTS`, `SILENT`), and claim recommendation generation.
