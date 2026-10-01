"""
Return Inspection Agent.

Orchestrates:
  1. Fetch order, product, return data (deterministic DB tools)
  2. Download images from Supabase Storage to temp files
  3. Run AI vision analysis
  4. Cross-check missing parts
  5. Apply return policy rules
  6. Persist inspection result
  7. Clean up temp files
"""
from __future__ import annotations

import logging
import os
from typing import Any

from sqlalchemy.orm import Session

import ai as ai_module
import tools
from models import DamageLevel, InspectionResult, Recommendation
from storage import download_to_tempfile, url_exists

logger = logging.getLogger(__name__)


class ReturnInspectionAgent:

    def __init__(self, db: Session):
        self.db = db

    # ── Tool wrappers ─────────────────────────────────────────────────────────

    def _get_order(self, order_id: int) -> dict[str, Any] | None:
        logger.debug("[tool] get_order(%s)", order_id)
        return tools.get_order(self.db, order_id)

    def _get_product(self, product_id: int) -> dict[str, Any] | None:
        logger.debug("[tool] get_product(%s)", product_id)
        return tools.get_product(self.db, product_id)

    def _get_original_image(self, order_id: int) -> dict[str, Any]:
        logger.debug("[tool] get_original_image(order_id=%s)", order_id)
        return tools.get_original_image(self.db, order_id)

    def _get_return(self, return_id: int) -> dict[str, Any] | None:
        logger.debug("[tool] get_return(%s)", return_id)
        return tools.get_return(self.db, return_id)

    def _analyze_images(
        self,
        original_path: str,
        returned_path: str,
        return_reason: str,
        required_components: list[str],
    ) -> dict[str, Any]:
        logger.debug("[tool] analyze_images")
        return ai_module.analyze_return_images(
            original_image_path=original_path,
            returned_image_path=returned_path,
            return_reason=return_reason,
            required_components=required_components,
        )

    def _check_missing_parts(self, reported: list[str], required: list[str]) -> dict[str, Any]:
        logger.debug("[tool] check_missing_parts")
        return tools.check_missing_parts(reported, required)

    def _get_return_policy(self, return_reason: str) -> dict[str, Any]:
        logger.debug("[tool] get_return_policy(%s)", return_reason)
        return tools.get_return_policy(return_reason)

    def _create_inspection(self, return_id: int, ai_result: dict[str, Any]) -> dict[str, Any]:
        logger.debug("[tool] create_inspection(return_id=%s)", return_id)
        return tools.create_inspection(self.db, return_id, ai_result)

    # ── Main orchestration ────────────────────────────────────────────────────

    def inspect(self, return_id: int) -> InspectionResult:
        """Run a full AI inspection. Returns a structured InspectionResult."""
        tmp_original = None
        tmp_returned = None

        try:
            # 1. Load return
            ret = self._get_return(return_id)
            if not ret:
                raise ValueError(f"Return request {return_id} not found.")

            # 2. Load order
            order = self._get_order(ret["order_id"])
            if not order:
                raise ValueError(f"Order {ret['order_id']} not found.")

            # 3. Load product
            product = self._get_product(order["product_id"])
            if not product:
                raise ValueError(f"Product {order['product_id']} not found.")

            required_components: list[str] = product.get("required_components", [])

            # 4. Resolve original packing image URL
            original_image_info = self._get_original_image(order["order_id"])
            if not original_image_info.get("exists"):
                raise ValueError(
                    "Packing photo not found for this order. "
                    "The packing manager must upload it before inspection."
                )
            original_url = original_image_info["url"]

            # 5. Resolve returned product image URL
            returned_url = ret.get("returned_photo_url")
            if not returned_url:
                raise ValueError("Customer has not uploaded a returned product photo.")
            if not url_exists(returned_url):
                raise ValueError("Returned product photo URL is not accessible.")

            # 6. Download images from Supabase to local temp files for AI processing
            logger.info("Downloading images from Supabase Storage for AI analysis…")
            tmp_original = download_to_tempfile(original_url)
            tmp_returned = download_to_tempfile(returned_url)
            logger.info("Images downloaded: original=%s returned=%s", tmp_original, tmp_returned)

            # 7. Return policy (deterministic)
            policy_info = self._get_return_policy(ret["reason"])

            # 8. AI vision analysis
            ai_result = self._analyze_images(
                original_path=tmp_original,
                returned_path=tmp_returned,
                return_reason=ret["reason"],
                required_components=required_components,
            )

            # 9. Cross-check missing parts deterministically
            ai_reported_present = [
                c for c in required_components
                if c not in ai_result.get("missing_parts", [])
            ]
            parts_check = self._check_missing_parts(ai_reported_present, required_components)
            ai_result["missing_parts"] = parts_check["missing"]

            # 10. Apply policy overrides
            ai_result = self._apply_policy(ai_result, policy_info)

            # 11. Persist
            saved = self._create_inspection(return_id, ai_result)
            logger.info(
                "Inspection complete for return_id=%s — recommendation=%s confidence=%.2f",
                return_id,
                saved.get("recommendation"),
                saved.get("confidence", 0),
            )

            return InspectionResult(
                product_match=saved["product_match"],
                missing_parts=saved["missing_parts"],
                damage=saved["damage"],
                scratches=saved["scratches"],
                return_reason_supported=saved["return_reason_supported"],
                damage_level=DamageLevel(saved["damage_level"]),
                confidence=saved["confidence"],
                recommendation=Recommendation(saved["recommendation"]),
                evidence=saved["evidence"],
            )

        finally:
            # Always clean up temp files
            for tmp in [tmp_original, tmp_returned]:
                if tmp and os.path.exists(tmp):
                    try:
                        os.unlink(tmp)
                    except OSError:
                        pass

    # ── Policy override layer ─────────────────────────────────────────────────

    @staticmethod
    def _apply_policy(ai_result: dict[str, Any], policy_info: dict[str, Any]) -> dict[str, Any]:
        policy = policy_info.get("policy", {})
        damage_level = ai_result.get("damage_level", "NONE")
        recommendation = ai_result.get("recommendation", "MANUAL_REVIEW")
        auto_reject_threshold = policy.get("auto_reject_threshold")

        damage_order = ["NONE", "LOW", "MEDIUM", "HIGH"]
        if auto_reject_threshold:
            try:
                if (damage_order.index(damage_level) >= damage_order.index(auto_reject_threshold)
                        and recommendation == "ACCEPT"):
                    ai_result["recommendation"] = "REJECT"
                    ai_result["evidence"] = ai_result.get("evidence", []) + [
                        f"Policy override: {policy.get('notes', '')}"
                    ]
            except ValueError:
                pass

        return ai_result
