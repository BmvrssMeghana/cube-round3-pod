"""
SQLAlchemy ORM models and Pydantic schemas for the Return Manager.
Uses PostgreSQL-specific JSONB for JSON columns.
"""
from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from pydantic import BaseModel
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# ── Enums ─────────────────────────────────────────────────────────────────────

class OrderStatus(str, enum.Enum):
    PENDING          = "PENDING"
    PACKED           = "PACKED"
    SHIPPED          = "SHIPPED"
    DELIVERED        = "DELIVERED"
    RETURN_REQUESTED = "RETURN_REQUESTED"
    RETURNED         = "RETURNED"


class ReturnStatus(str, enum.Enum):
    PENDING       = "PENDING"
    INSPECTING    = "INSPECTING"
    ACCEPTED      = "ACCEPTED"
    REJECTED      = "REJECTED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class DamageLevel(str, enum.Enum):
    NONE   = "NONE"
    LOW    = "LOW"
    MEDIUM = "MEDIUM"
    HIGH   = "HIGH"


class Recommendation(str, enum.Enum):
    ACCEPT        = "ACCEPT"
    REJECT        = "REJECT"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class FinalDecision(str, enum.Enum):
    ACCEPTED      = "ACCEPTED"
    REJECTED      = "REJECTED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


# ── ORM Models ────────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String(200), nullable=False)
    description         = Column(Text)
    price               = Column(Float, nullable=False)
    image_url           = Column(String(500))
    images              = Column(JSONB, default=list)   # list of extra image URLs
    required_components = Column(JSONB, default=list)
    stock               = Column(Integer, default=100)
    created_at          = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id                = Column(Integer, primary_key=True, index=True)
    customer_name     = Column(String(200), nullable=False)
    customer_email    = Column(String(200), nullable=False)
    product_id        = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity          = Column(Integer, default=1)
    status            = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    # Supabase Storage public URL for the packing photo
    packing_photo_url = Column(String(1000))
    created_at        = Column(DateTime, default=datetime.utcnow)
    shipped_at        = Column(DateTime)

    product        = relationship("Product", back_populates="orders")
    return_request = relationship("Return", back_populates="order", uselist=False)


class Return(Base):
    __tablename__ = "returns"

    id                  = Column(Integer, primary_key=True, index=True)
    order_id            = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    reason              = Column(String(500), nullable=False)
    reason_description  = Column(Text)
    # Supabase Storage public URL for the returned product photo
    returned_photo_url  = Column(String(1000))
    status              = Column(Enum(ReturnStatus), default=ReturnStatus.PENDING)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order      = relationship("Order", back_populates="return_request")
    inspection = relationship("Inspection", back_populates="return_request", uselist=False)


class Inspection(Base):
    __tablename__ = "inspections"

    id                      = Column(Integer, primary_key=True, index=True)
    return_id               = Column(Integer, ForeignKey("returns.id"), nullable=False, unique=True)
    product_match           = Column(Boolean)
    missing_parts           = Column(JSONB, default=list)
    damage                  = Column(JSONB, default=list)
    scratches               = Column(JSONB, default=list)
    return_reason_supported = Column(Boolean)
    damage_level            = Column(Enum(DamageLevel))
    confidence              = Column(Float)
    recommendation          = Column(Enum(Recommendation))
    evidence                = Column(JSONB, default=list)
    final_decision          = Column(Enum(FinalDecision))
    operator_note           = Column(Text)
    decided_by              = Column(String(200))
    decided_at              = Column(DateTime)
    created_at              = Column(DateTime, default=datetime.utcnow)

    return_request = relationship("Return", back_populates="inspection")


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: int
    name: str
    description: str | None
    price: float
    image_url: str | None
    images: list[str] = []
    required_components: list[str]
    stock: int

    model_config = {"from_attributes": True}

    from pydantic import field_validator

    @field_validator('images', mode='before')
    @classmethod
    def coerce_images(cls, v):
        if v is None:
            return []
        return v


class OrderCreate(BaseModel):
    customer_name:  str
    customer_email: str
    product_id:     int
    quantity:       int = 1


class OrderOut(BaseModel):
    id:                 int
    customer_name:      str
    customer_email:     str
    product_id:         int
    quantity:           int
    status:             OrderStatus
    packing_photo_url:  str | None   # renamed from packing_photo_path
    created_at:         datetime
    shipped_at:         datetime | None
    product:            ProductOut | None = None

    class Config:
        from_attributes = True


class ReturnCreate(BaseModel):
    order_id:           int
    reason:             str
    reason_description: str | None = None


class ReturnOut(BaseModel):
    id:                  int
    order_id:            int
    reason:              str
    reason_description:  str | None
    returned_photo_url:  str | None   # renamed from returned_photo_path
    status:              ReturnStatus
    created_at:          datetime
    updated_at:          datetime
    order:               OrderOut | None = None

    class Config:
        from_attributes = True


class InspectionResult(BaseModel):
    product_match:           bool
    missing_parts:           list[str]
    damage:                  list[dict[str, Any]]
    scratches:               list[dict[str, Any]]
    return_reason_supported: bool
    damage_level:            DamageLevel
    confidence:              float
    recommendation:          Recommendation
    evidence:                list[str]


class InspectionOut(BaseModel):
    id:                      int
    return_id:               int
    product_match:           bool | None
    missing_parts:           list[str]
    damage:                  list[dict[str, Any]]
    scratches:               list[dict[str, Any]]
    return_reason_supported: bool | None
    damage_level:            DamageLevel | None
    confidence:              float | None
    recommendation:          Recommendation | None
    evidence:                list[str]
    final_decision:          FinalDecision | None
    operator_note:           str | None
    decided_by:              str | None
    decided_at:              datetime | None
    created_at:              datetime

    class Config:
        from_attributes = True


class DecisionCreate(BaseModel):
    decision:      FinalDecision
    operator_note: str | None = None
    decided_by:    str = "operator"
