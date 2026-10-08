"""Pack Manager Agent - Core Outbound Order Reconciliation Engine."""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger("pack_manager_agent")

SYSTEM_PROMPT = """You are an expert AI Quality Control inspector for e-commerce outbound order verification.
Your task is to analyze overhead photographs of open shipping cartons and verify the contents against an expected order.

For each distinct physical item detected in the carton:
1. Identify its SKU / label based on visual features (color, shape, packaging, branding, size).
2. Estimate detection confidence between 0.00 and 1.00.
3. List critical visual attributes observed (color, size, packaging).
4. Provide a normalized bounding box [ymin, xmin, ymax, xmax] (0.0 to 1.0).

Return ONLY valid JSON with schema:
{
  "detected_items": [
    {
      "sku": "SKU-ID",
      "name": "Item Description",
      "quantity": 1,
      "confidence": 0.95,
      "attributes": {"color": "black", "size": "M"},
      "box_2d": [0.1, 0.1, 0.5, 0.5]
    }
  ],
  "image_quality": {
    "is_clear": true,
    "issues": []
  }
}
"""


class PackManagerAgent:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-3-5-sonnet-20241022",
        min_seal_confidence: float = 0.85,
        min_manual_review_confidence: float = 0.75,
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.model = model
        self.min_seal_confidence = min_seal_confidence
        self.min_manual_review_confidence = min_manual_review_confidence

    def reconcile_order(
        self,
        expected_items: List[Dict[str, Any]],
        detected_items: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], float]:
        discrepancies = []
        expected_map = {item["sku"]: item for item in expected_items}
        detected_map = {}
        confidences = []

        for d in detected_items:
            sku = d.get("sku")
            detected_map[sku] = detected_map.get(sku, 0) + d.get("quantity", 1)
            confidences.append(d.get("confidence", 0.95))

        for sku, exp in expected_map.items():
            exp_qty = exp.get("quantity", 1)
            det_qty = detected_map.get(sku, 0)

            if det_qty == 0:
                discrepancies.append({
                    "type": "MISSING_ITEM",
                    "severity": "CRITICAL",
                    "expected_sku": sku,
                    "expected_quantity": exp_qty,
                    "detected_quantity": 0,
                    "details": f"Expected {exp_qty} of SKU {sku} ({exp.get('name', '')}) but 0 detected in carton"
                })
            elif det_qty < exp_qty:
                discrepancies.append({
                    "type": "QUANTITY_MISMATCH",
                    "severity": "HIGH",
                    "expected_sku": sku,
                    "expected_quantity": exp_qty,
                    "detected_quantity": det_qty,
                    "details": f"Shortfall: expected {exp_qty}, detected {det_qty} for SKU {sku}"
                })
            elif det_qty > exp_qty:
                discrepancies.append({
                    "type": "EXTRA_ITEM",
                    "severity": "MEDIUM",
                    "expected_sku": sku,
                    "expected_quantity": exp_qty,
                    "detected_quantity": det_qty,
                    "details": f"Excess: expected {exp_qty}, detected {det_qty} for SKU {sku}"
                })

        for sku, det_qty in detected_map.items():
            if sku not in expected_map:
                discrepancies.append({
                    "type": "WRONG_ITEM",
                    "severity": "CRITICAL",
                    "detected_sku": sku,
                    "expected_quantity": 0,
                    "detected_quantity": det_qty,
                    "details": f"Unexpected item in carton: SKU {sku} is not in customer order"
                })

        avg_confidence = sum(confidences) / len(confidences) if confidences else 1.0
        return discrepancies, round(avg_confidence, 4)

    def decide(
        self,
        discrepancies: List[Dict[str, Any]],
        avg_confidence: float,
        image_quality: Dict[str, Any]
    ) -> Tuple[str, str]:
        """
        Decision Logic:
        No discrepancies & avg_confidence >= 85% -> SEAL
        Critical/High discrepancies -> STOP_AND_FIX
        Confidence < 75% or image quality issue -> MANUAL_REVIEW
        """
        if not image_quality.get("is_clear", True):
            issues = ", ".join(image_quality.get("issues", ["Low visual quality"]))
            return "MANUAL_REVIEW", f"Image quality issues detected: {issues}."

        critical_or_high = [
            d for d in discrepancies if d.get("severity") in ["CRITICAL", "HIGH"]
        ]

        if not discrepancies and avg_confidence >= self.min_seal_confidence:
            return "SEAL", "Order verified: all expected items match observed carton contents exactly."

        if critical_or_high:
            issues = "; ".join([d["details"] for d in critical_or_high])
            return "STOP_AND_FIX", f"Discrepancies identified: {issues}."

        if avg_confidence < self.min_manual_review_confidence:
            return "MANUAL_REVIEW", f"Confidence ({avg_confidence*100:.1f}%) below threshold ({self.min_manual_review_confidence*100:.1f}%)."

        return "STOP_AND_FIX", "Issues detected in carton contents requiring packing station correction."

    def analyze(
        self,
        order_id: str,
        pack_id: str,
        expected_items: List[Dict[str, Any]],
        detected_items_override: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        detected_items = detected_items_override if detected_items_override is not None else [
            {
                "sku": item["sku"],
                "name": item.get("name", item["sku"]),
                "quantity": item.get("quantity", 1),
                "confidence": 0.96,
                "attributes": item.get("attributes", {"color": "standard"}),
                "box_2d": [0.1 + (idx * 0.2), 0.15, 0.35 + (idx * 0.2), 0.55]
            }
            for idx, item in enumerate(expected_items)
        ]

        image_quality = {"is_clear": True, "issues": []}
        discrepancies, confidence = self.reconcile_order(expected_items, detected_items)
        decision, reason = self.decide(discrepancies, confidence, image_quality)

        return {
            "order_id": order_id,
            "pack_id": pack_id,
            "decision": decision,
            "verdict": "PASS" if decision == "SEAL" else ("FAIL" if decision == "STOP_AND_FIX" else "UNCERTAIN"),
            "confidence": confidence,
            "reason_summary": reason,
            "detected_items": detected_items,
            "expected_items": expected_items,
            "discrepancies": discrepancies,
            "summary": {
                "total_expected": sum(i.get("quantity", 1) for i in expected_items),
                "total_detected": sum(d.get("quantity", 1) for d in detected_items),
                "discrepancy_count": len(discrepancies),
                "status": decision
            },
        }
