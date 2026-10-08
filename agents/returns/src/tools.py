"""
Deterministic backend tools used by the Return Inspection Agent.
All DB queries live here — the agent never touches the DB directly.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from models import Inspection, Order, OrderStatus, Product, Return, ReturnStatus
from storage import url_exists

logger = logging.getLogger(__name__)


# ── Order ─────────────────────────────────────────────────────────────────────

def get_order(db: Session, order_id: int) -> dict[str, Any] | None:
    order: Order | None = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None
    product = order.product
    return {
        "order_id":           order.id,
        "customer_name":      order.customer_name,
        "customer_email":     order.customer_email,
        "product_id":         order.product_id,
        "product_name":       product.name if product else None,
        "quantity":           order.quantity,
        "status":             order.status.value,
        "packing_photo_url":  order.packing_photo_url,
        "created_at":         order.created_at.isoformat(),
        "shipped_at":         order.shipped_at.isoformat() if order.shipped_at else None,
    }


# ── Product ───────────────────────────────────────────────────────────────────

def get_product(db: Session, product_id: int) -> dict[str, Any] | None:
    product: Product | None = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None
    return {
        "product_id":           product.id,
        "name":                 product.name,
        "description":          product.description,
        "price":                product.price,
        "required_components":  product.required_components or [],
    }


# ── Image ─────────────────────────────────────────────────────────────────────

def get_original_image(db: Session, order_id: int) -> dict[str, Any]:
    """Return the Supabase public URL for the packing photo of an order."""
    order: Order | None = db.query(Order).filter(Order.id == order_id).first()
    if not order or not order.packing_photo_url:
        return {"url": None, "exists": False, "error": "No packing photo found for this order."}
    exists = url_exists(order.packing_photo_url)
    return {"url": order.packing_photo_url, "exists": exists}


# ── Return ────────────────────────────────────────────────────────────────────

def get_return(db: Session, return_id: int) -> dict[str, Any] | None:
    ret: Return | None = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        return None
    return {
        "return_id":           ret.id,
        "order_id":            ret.order_id,
        "reason":              ret.reason,
        "reason_description":  ret.reason_description,
        "returned_photo_url":  ret.returned_photo_url,
        "status":              ret.status.value,
        "created_at":          ret.created_at.isoformat(),
    }


def get_return_policy(return_reason: str) -> dict[str, Any]:
    policies: dict[str, dict] = {
        "defective": {
            "auto_accept_threshold": "LOW",
            "auto_reject_threshold": None,
            "notes": "Defective products are generally accepted regardless of damage level.",
        },
        "damaged_in_shipping": {
            "auto_accept_threshold": "MEDIUM",
            "auto_reject_threshold": None,
            "notes": "Damage must be consistent with shipping impact.",
        },
        "wrong_item": {
            "auto_accept_threshold": None,
            "auto_reject_threshold": None,
            "notes": "Product identity mismatch must be confirmed visually.",
        },
        "not_as_described": {
            "auto_accept_threshold": "LOW",
            "auto_reject_threshold": None,
            "notes": "Cosmetic differences may qualify.",
        },
        "changed_mind": {
            "auto_accept_threshold": "NONE",
            "auto_reject_threshold": "LOW",
            "notes": "Product must be returned in original undamaged condition.",
        },
        "missing_parts": {
            "auto_accept_threshold": None,
            "auto_reject_threshold": None,
            "notes": "Missing parts must be verified against the component list.",
        },
    }
    reason_key = return_reason.lower().replace(" ", "_")
    policy = policies.get(reason_key, {
        "auto_accept_threshold": None,
        "auto_reject_threshold": None,
        "notes": "No specific policy found. Manual review recommended.",
    })
    return {"reason": return_reason, "policy": policy}


# ── Inspection ────────────────────────────────────────────────────────────────

def check_missing_parts(
    reported_components: list[str],
    required_components: list[str],
) -> dict[str, Any]:
    required_set = {c.lower().replace(" ", "_") for c in required_components}
    reported_set = {c.lower().replace(" ", "_") for c in reported_components}
    missing = sorted(required_set - reported_set)
    return {
        "required":         required_components,
        "reported_present": reported_components,
        "missing":          missing,
        "all_present":      len(missing) == 0,
    }


def create_inspection(
    db: Session,
    return_id: int,
    ai_result: dict[str, Any],
) -> dict[str, Any]:
    ret: Return | None = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        raise ValueError(f"Return {return_id} not found.")

    inspection: Inspection | None = (
        db.query(Inspection).filter(Inspection.return_id == return_id).first()
    )
    if not inspection:
        inspection = Inspection(return_id=return_id)
        db.add(inspection)

    inspection.product_match           = ai_result.get("product_match")
    inspection.missing_parts           = ai_result.get("missing_parts", [])
    inspection.damage                  = ai_result.get("damage", [])
    inspection.scratches               = ai_result.get("scratches", [])
    inspection.return_reason_supported = ai_result.get("return_reason_supported")
    inspection.damage_level            = ai_result.get("damage_level", "NONE")
    inspection.confidence              = ai_result.get("confidence")
    inspection.recommendation          = ai_result.get("recommendation")
    inspection.evidence                = ai_result.get("evidence", [])
    ret.status = ReturnStatus.INSPECTING

    db.commit()
    db.refresh(inspection)

    return {
        "inspection_id":            inspection.id,
        "return_id":                inspection.return_id,
        "product_match":            inspection.product_match,
        "missing_parts":            inspection.missing_parts,
        "damage":                   inspection.damage,
        "scratches":                inspection.scratches,
        "return_reason_supported":  inspection.return_reason_supported,
        "damage_level":             inspection.damage_level,
        "confidence":               inspection.confidence,
        "recommendation":           inspection.recommendation,
        "evidence":                 inspection.evidence,
        "created_at":               inspection.created_at.isoformat(),
    }
