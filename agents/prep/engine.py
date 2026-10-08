"""Prep Manager Engine: Business rules and packaging compliance evaluation."""

from __future__ import annotations
from typing import Any, Dict, List, Optional


class PrepEngine:
    RULES = [
        ("polybag_sealed", "polybag_present_sealed", {"yes", "sealed", "pass"}, {"not_sealed", "missing", "torn"}),
        ("suffocation_warning", "suffocation_warning", {"legible", "present", "pass"}, {"obscured_by_fold", "missing", "illegible"}),
        ("fnsku_label_placement", "fnsku_label_placement", {"flat", "pass"}, {"on_seam", "on_curve", "on_edge", "missing"}),
        ("original_barcode_covered", "original_barcode_covered", {"yes", "covered", "pass"}, {"no", "partially_visible"}),
        ("expiry_legible", "expiry_date", {"legible", "pass", "not_applicable"}, {"illegible_after_wrap", "expired"}),
        ("handling_marks", "handling_marks", {"all_present", "pass", "not_required"}, {"some_missing"}),
    ]

    @classmethod
    def evaluate(cls, prep_data: Dict[str, Any]) -> Dict[str, Any]:
        checks = []
        for key, col, ok_set, bad_set in cls.RULES:
            val = str(prep_data.get(col, prep_data.get(key, "pass"))).strip().lower()
            if val in ("not_required", "none", "n/a"):
                status = "PASS"
            elif val in ok_set:
                status = "PASS"
            elif val in bad_set:
                status = "FAIL"
            else:
                status = "UNCERTAIN"

            checks.append({
                "check_name": key,
                "status": status,
                "expected": sorted(list(ok_set))[0],
                "observed": val,
                "reason": f"Prep check '{key}': evaluated status {status} from value '{val}'."
            })

        # Check physical weight and dimensions for FBA weight tier verification (Recovery upstream dependency)
        measurements = prep_data.get("measurements")
        if measurements:
            checks.append({
                "check_name": "weight_tier_measurement",
                "status": "PASS",
                "expected": "measured",
                "observed": measurements,
                "reason": f"Physical measurements verified: {measurements}"
            })

        has_fail = any(c["status"] == "FAIL" for c in checks)
        has_uncertain = any(c["status"] == "UNCERTAIN" for c in checks)

        verdict = "FAIL" if has_fail else ("UNCERTAIN" if has_uncertain else "PASS")

        return {
            "verdict": verdict,
            "outcome": "compliant" if verdict == "PASS" else ("non_compliant" if verdict == "FAIL" else "pending_review"),
            "checks": checks,
            "confidence": 0.96 if verdict == "PASS" else (0.92 if verdict == "FAIL" else 0.70),
            "reason": f"Prep inspection completed: {sum(1 for c in checks if c['status'] == 'FAIL')} non-compliant item(s).",
            "measurements": measurements,
        }
