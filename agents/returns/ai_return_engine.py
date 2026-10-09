"""Returns Manager AI Engine: Condition Grading, Completeness & Disposition Engine."""

from __future__ import annotations
import os
from typing import Any, Dict, List, Optional


class ReturnManagerEngine:
    AMAZON_CONDITIONS = {
        "factory_sealed": {"grade": "New", "disposition": "restock", "value_recovery": 1.0},
        "opened_good": {"grade": "Used - Like New", "disposition": "restock", "value_recovery": 0.85},
        "signs_of_use": {"grade": "Used - Good", "disposition": "liquidate", "value_recovery": 0.60},
        "damaged_box": {"grade": "Used - Very Good", "disposition": "refurbish", "value_recovery": 0.70},
        "item_damaged": {"grade": "Unsellable", "disposition": "liquidate", "value_recovery": 0.30},
        "damaged": {"grade": "Unsellable", "disposition": "liquidate", "value_recovery": 0.30},
        "defective": {"grade": "Unsellable", "disposition": "dispose", "value_recovery": 0.0},
    }

    @classmethod
    def evaluate_return(
        cls,
        returned_sku: str,
        expected_sku: str,
        observed_state: str,
        missing_parts: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        parts_missing = missing_parts or []
        sku_match = returned_sku.strip().lower() == expected_sku.strip().lower() if returned_sku and expected_sku else False
        
        state_key = observed_state.strip().lower().replace(" ", "_")
        cond_info = cls.AMAZON_CONDITIONS.get(state_key, {
            "grade": "Uncertain",
            "disposition": "pending_review",
            "value_recovery": 0.5
        })

        checks = [
            {
                "check_name": "identity_match",
                "status": "PASS" if sku_match else "FAIL",
                "expected": expected_sku,
                "observed": returned_sku,
                "reason": "Returned SKU matches original order." if sku_match else f"Returned SKU mismatch ({returned_sku} vs {expected_sku})."
            },
            {
                "check_name": "completeness",
                "status": "FAIL" if parts_missing else "PASS",
                "expected": "All components present",
                "observed": f"Missing: {parts_missing}" if parts_missing else "Complete",
                "reason": f"Missing parts detected: {parts_missing}" if parts_missing else "All parts verified intact."
            },
            {
                "check_name": "condition_grading",
                "status": "PASS" if cond_info["disposition"] in ("restock", "refurbish") else "FAIL",
                "expected": "Restockable condition",
                "observed": f"{cond_info['grade']} ({observed_state})",
                "reason": f"Assigned disposition '{cond_info['disposition']}' under Amazon condition grading."
            }
        ]

        has_fail = any(c["status"] == "FAIL" for c in checks)
        verdict = "FAIL" if has_fail else "PASS"

        return {
            "verdict": verdict,
            "disposition": cond_info["disposition"],
            "amazon_condition": cond_info["grade"],
            "value_recovery_ratio": cond_info["value_recovery"],
            "checks": checks,
            "confidence": 0.94 if verdict == "PASS" else 0.89,
            "reason": f"Return inspection evaluated: disposition assigned as {cond_info['disposition']} (Grade: {cond_info['grade']}).",
        }
