"""
FastAPI application — Return Manager API.
Images are stored in Supabase Storage (not local disk).

Endpoints:
  Products:   GET  /products  |  GET /products/{id}
  Orders:     POST /orders    |  GET /orders  |  GET /orders/{id}
  Packing:    POST /packing/{order_id}/photo  |  POST /packing/{order_id}/ship
  Returns:    POST /returns   |  GET /returns  |  GET /returns/{id}
              POST /returns/{id}/photo
  Inspection: POST /returns/{id}/inspect  |  GET /inspections/{return_id}
  Decisions:  POST /returns/{id}/approve  |  /reject  |  /manual-review
  Stats:      GET  /stats
"""
from __future__ import annotations

import logging
from datetime import datetime

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import storage
from agent import ReturnInspectionAgent
from config import FRONTEND_URL
from database import get_db, init_db
from models import (
    DecisionCreate,
    FinalDecision,
    Inspection,
    InspectionOut,
    Order,
    OrderCreate,
    OrderOut,
    OrderStatus,
    Product,
    ProductOut,
    Return,
    ReturnCreate,
    ReturnOut,
    ReturnStatus,
)

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Return Manager API",
    description="AI-powered e-commerce return inspection system.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOTE: No local StaticFiles mount — images are served directly from Supabase CDN.


@app.on_event("startup")
def on_startup():
    logger.info("Initialising database…")
    init_db()
    logger.info("Database ready.")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Return Manager API is running", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Products ──────────────────────────────────────────────────────────────────

@app.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


# ── Orders ────────────────────────────────────────────────────────────────────

@app.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    if product.stock < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock.")

    order = Order(
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        product_id=payload.product_id,
        quantity=payload.quantity,
        status=OrderStatus.PENDING,
    )
    product.stock -= payload.quantity
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@app.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


# ── Packing Manager ───────────────────────────────────────────────────────────

@app.post("/packing/{order_id}/photo", response_model=OrderOut)
async def upload_packing_photo(
    order_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status not in (OrderStatus.PENDING, OrderStatus.PACKED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload packing photo for order in status '{order.status.value}'.",
        )

    public_url = await storage.save_packing_photo(file, order_id)
    order.packing_photo_url = public_url
    order.status = OrderStatus.PACKED
    db.commit()
    db.refresh(order)
    return order


@app.post("/packing/{order_id}/ship", response_model=OrderOut)
def ship_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status != OrderStatus.PACKED:
        raise HTTPException(
            status_code=400,
            detail="Order must be in PACKED status before shipping. Upload a packing photo first.",
        )

    order.status = OrderStatus.SHIPPED
    order.shipped_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


# ── Returns ───────────────────────────────────────────────────────────────────

@app.post("/returns", response_model=ReturnOut, status_code=status.HTTP_201_CREATED)
def create_return(payload: ReturnCreate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status not in (OrderStatus.SHIPPED, OrderStatus.DELIVERED):
        raise HTTPException(
            status_code=400,
            detail="Returns can only be requested for shipped or delivered orders.",
        )
    existing = db.query(Return).filter(Return.order_id == payload.order_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="A return request already exists for this order.")

    ret = Return(
        order_id=payload.order_id,
        reason=payload.reason,
        reason_description=payload.reason_description,
        status=ReturnStatus.PENDING,
    )
    order.status = OrderStatus.RETURN_REQUESTED
    db.add(ret)
    db.commit()
    db.refresh(ret)
    return ret


@app.get("/returns", response_model=list[ReturnOut])
def list_returns(db: Session = Depends(get_db)):
    return db.query(Return).order_by(Return.created_at.desc()).all()


@app.get("/returns/{return_id}", response_model=ReturnOut)
def get_return(return_id: int, db: Session = Depends(get_db)):
    ret = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found.")
    return ret


@app.post("/returns/{return_id}/photo", response_model=ReturnOut)
async def upload_return_photo(
    return_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ret = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found.")
    if ret.status not in (ReturnStatus.PENDING, ReturnStatus.INSPECTING):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload photo for return in status '{ret.status.value}'.",
        )

    public_url = await storage.save_return_photo(file, return_id)
    ret.returned_photo_url = public_url
    db.commit()
    db.refresh(ret)
    return ret


# ── AI Inspection ─────────────────────────────────────────────────────────────

@app.post("/returns/{return_id}/inspect", response_model=InspectionOut)
def inspect_return(return_id: int, db: Session = Depends(get_db)):
    """Trigger the Return Inspection Agent."""
    ret = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found.")
    if not ret.returned_photo_url:
        raise HTTPException(
            status_code=400,
            detail="Returned product photo must be uploaded before inspection.",
        )

    try:
        agent = ReturnInspectionAgent(db)
        agent.inspect(return_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Inspection failed for return_id=%s", return_id)
        raise HTTPException(status_code=500, detail=f"Inspection failed: {exc}")

    inspection = db.query(Inspection).filter(Inspection.return_id == return_id).first()
    if not inspection:
        raise HTTPException(status_code=500, detail="Inspection record not created.")
    return inspection


@app.get("/inspections/{return_id}", response_model=InspectionOut)
def get_inspection(return_id: int, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).filter(Inspection.return_id == return_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found for this return.")
    return inspection


# ── Human Decisions ───────────────────────────────────────────────────────────

def _apply_decision(
    return_id: int, decision: FinalDecision, payload: DecisionCreate, db: Session
) -> InspectionOut:
    ret = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found.")

    inspection = db.query(Inspection).filter(Inspection.return_id == return_id).first()
    if not inspection:
        raise HTTPException(status_code=400, detail="No inspection found. Run /inspect first.")

    inspection.final_decision = decision
    inspection.operator_note  = payload.operator_note
    inspection.decided_by     = payload.decided_by
    inspection.decided_at     = datetime.utcnow()

    status_map = {
        FinalDecision.ACCEPTED:      ReturnStatus.ACCEPTED,
        FinalDecision.REJECTED:      ReturnStatus.REJECTED,
        FinalDecision.MANUAL_REVIEW: ReturnStatus.MANUAL_REVIEW,
    }
    ret.status = status_map[decision]
    db.commit()
    db.refresh(inspection)
    return inspection


@app.post("/returns/{return_id}/approve", response_model=InspectionOut)
def approve_return(return_id: int, payload: DecisionCreate, db: Session = Depends(get_db)):
    return _apply_decision(return_id, FinalDecision.ACCEPTED, payload, db)


@app.post("/returns/{return_id}/reject", response_model=InspectionOut)
def reject_return(return_id: int, payload: DecisionCreate, db: Session = Depends(get_db)):
    return _apply_decision(return_id, FinalDecision.REJECTED, payload, db)


@app.post("/returns/{return_id}/manual-review", response_model=InspectionOut)
def manual_review_return(return_id: int, payload: DecisionCreate, db: Session = Depends(get_db)):
    return _apply_decision(return_id, FinalDecision.MANUAL_REVIEW, payload, db)


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total     = db.query(Return).count()
    completed = db.query(Return).filter(Return.status.in_([ReturnStatus.ACCEPTED, ReturnStatus.REJECTED])).count()
    failed    = db.query(Return).filter(Return.status == ReturnStatus.REJECTED).count()
    return {"total": total, "completed": completed, "failed": failed}
