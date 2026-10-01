"""
Database setup: SQLAlchemy engine + session for Supabase PostgreSQL.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL
from models import Base, Product

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,       # reconnect on stale connections
    pool_recycle=300,         # recycle connections every 5 min
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and seed demo products."""
    Base.metadata.create_all(bind=engine)
    _seed_products()


def _seed_products():
    """Insert demo products if the table is empty."""
    db = SessionLocal()
    try:
        if db.query(Product).count() > 0:
            return
        products = [
            Product(
                name="iPhone 15 Pro",
                description="Apple smartphone, 256 GB, titanium finish.",
                price=999.00,
                image_url="https://images.unsplash.com/photo-1697399736291-94ccd3c67c6a?w=400",
                required_components=["charging_cable", "documentation", "sim_tool"],
                stock=50,
            ),
            Product(
                name="Sony WH-1000XM5 Headphones",
                description="Wireless noise-cancelling over-ear headphones.",
                price=349.00,
                image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                required_components=["audio_cable", "carrying_case", "charging_cable", "documentation"],
                stock=80,
            ),
            Product(
                name='Samsung 65" QLED TV',
                description="4K smart TV with QLED display technology.",
                price=1299.00,
                image_url="https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=400",
                required_components=["remote_control", "power_cable", "stand", "documentation"],
                stock=20,
            ),
            Product(
                name="MacBook Pro 14-inch",
                description="Apple MacBook Pro with M3 Pro chip, 18 GB RAM.",
                price=1999.00,
                image_url="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
                required_components=["charging_cable", "documentation"],
                stock=30,
            ),
            Product(
                name="DJI Mini 4 Pro Drone",
                description="Compact drone with 4K/60fps video and obstacle avoidance.",
                price=759.00,
                image_url="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400",
                required_components=["remote_controller", "battery", "charging_cable", "propellers", "documentation"],
                stock=25,
            ),
        ]
        db.add_all(products)
        db.commit()
    finally:
        db.close()
