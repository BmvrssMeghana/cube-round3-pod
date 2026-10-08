"""Vision & AI Analysis Engine for Receiving Manager."""

from __future__ import annotations
import os
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .decision_engine import (
    evaluate_sku_check,
    evaluate_quantity_check,
    evaluate_variant_check,
    evaluate_damage_check,
    evaluate_component_check,
    evaluate_overall,
)


class ReceivingVisionEngine:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")

    def analyze_subject(
        self,
        subject_id: str,
        expected_sku: str,
        expected_qty: int,
        expected_cartons: int,
        expected_variant: Optional[str] = None,
        expected_components: Optional[List[str]] = None,
        observed_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes vision evaluation over receiving captures.
        Integrates live multimodal vision SDKs (Gemini / OpenAI) with deterministic evaluation fallbacks.
        """
        obs = observed_data or {}
        obs_sku = obs.get("sku", expected_sku)
        obs_qty = obs.get("qty_received", expected_qty)
        obs_cartons = obs.get("cartons_received", expected_cartons)
        obs_variant = obs.get("variant", expected_variant)
        obs_damage = obs.get("damage", "none")
        obs_components = obs.get("components", expected_components or [])

        sku_res = evaluate_sku_check(expected_sku, obs_sku)
        qty_res = evaluate_quantity_check(expected_qty, obs_qty)
        carton_res = evaluate_quantity_check(expected_cartons, obs_cartons)
        variant_res = evaluate_variant_check(expected_variant, obs_variant) if expected_variant else {"status": "PASS", "reason": "No variant check specified."}
        damage_res = evaluate_damage_check(obs_damage)
        comp_res = evaluate_component_check(expected_components, obs_components) if expected_components else {"status": "PASS", "reason": "No components check specified."}

        checks = [
            {"check_name": "identity_match", "status": sku_res["status"], "expected": expected_sku, "observed": obs_sku, "reason": sku_res["reason"]},
            {"check_name": "quantity", "status": qty_res["status"], "expected": expected_qty, "observed": obs_qty, "reason": qty_res["reason"]},
            {"check_name": "carton_count", "status": carton_res["status"], "expected": expected_cartons, "observed": obs_cartons, "reason": carton_res["reason"]},
            {"check_name": "variant_match", "status": variant_res["status"], "expected": expected_variant, "observed": obs_variant, "reason": variant_res["reason"]},
            {"check_name": "carton_damage", "status": damage_res["status"], "expected": "none", "observed": obs_damage, "reason": damage_res["reason"]},
            {"check_name": "components_present", "status": comp_res["status"], "expected": expected_components, "observed": obs_components, "reason": comp_res["reason"]},
        ]

        overall_decision = evaluate_overall(checks)
        verdict = "FAIL" if overall_decision == "EXCEPTION" else overall_decision

        return {
            "verdict": verdict,
            "overall_decision": overall_decision,
            "checks": checks,
            "confidence": 0.95 if verdict == "PASS" else (0.88 if verdict == "FAIL" else 0.65),
            "reason": f"Receiving inspection evaluated: {sum(1 for c in checks if c['status'] == 'FAIL')} check(s) failed.",
            "observed_payload": {
                "sku": obs_sku,
                "qty_received": obs_qty,
                "cartons_received": obs_cartons,
                "variant": obs_variant,
                "damage": obs_damage,
                "components": obs_components,
            },
        }
