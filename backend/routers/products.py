from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
import redis.asyncio as redis

from ..database import get_db
from ..models import db_models, schemas
from ..config import settings
from .auth import get_current_user
from ..services.websocket_manager import manager

router = APIRouter(prefix="/products", tags=["products"])
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.get("/", response_model=List[schemas.ProductResponse])
async def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    query = select(db_models.Product)
    if category:
        query = query.filter(db_models.Product.category == category)
    if search:
        query = query.filter(db_models.Product.name.ilike(f"%{search}%"))
    if min_price is not None:
        query = query.filter(db_models.Product.current_price >= min_price)
    if max_price is not None:
        query = query.filter(db_models.Product.current_price <= max_price)

    if sort == "price_asc":
        query = query.order_by(db_models.Product.current_price.asc())
    elif sort == "price_desc":
        query = query.order_by(db_models.Product.current_price.desc())
    elif sort == "popularity":
        # Sub-query to count events (clicks/views) per product
        event_count = (
            select(
                db_models.Event.product_id,
                func.count(db_models.Event.id).label("event_count")
            )
            .group_by(db_models.Event.product_id)
            .subquery()
        )
        query = (
            query
            .outerjoin(event_count, db_models.Product.id == event_count.c.product_id)
            .order_by(func.coalesce(event_count.c.event_count, 0).desc())
        )

    result = await db.execute(query.limit(limit))
    return result.scalars().all()

@router.get("/suggestions")
async def product_suggestions(
    q: str = "",
    limit: int = 6,
    db: AsyncSession = Depends(get_db)
):
    if not q or len(q) < 2:
        return []
    query = (
        select(db_models.Product.id, db_models.Product.name)
        .filter(db_models.Product.name.ilike(f"%{q}%"))
        .limit(limit)
    )
    result = await db.execute(query)
    return [{"id": row.id, "name": row.name} for row in result.all()]

@router.get("/{product_id}", response_model=schemas.ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[db_models.User] = Depends(get_current_user)
):
    result = await db.execute(select(db_models.Product).filter(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 1. Increment Redis view count for dynamic pricing engine
    await redis_client.incr(f"product:{product_id}:views")

    # 2. Record Event (Async, don't wait for DB if possible but keeping it simple)
    if user:
        new_event = db_models.Event(
            user_id=user.id,
            product_id=product_id,
            event_type=db_models.EventType.VIEW
        )
        db.add(new_event)
        await db.commit()

    return product

@router.post("/{product_id}/click")
async def record_click(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user)
):
    # 1. Increment Redis click count
    await redis_client.incr(f"product:{product_id}:clicks")

    # 2. Record Event
    new_event = db_models.Event(
        user_id=user.id,
        product_id=product_id,
        event_type=db_models.EventType.CLICK
    )
    db.add(new_event)
    await db.commit()

    # Broadcast click event for real-time dashboard updates
    clicks = await redis_client.get(f"product:{product_id}:clicks") or 0
    await manager.broadcast({
        "type": "product_click",
        "product_id": product_id,
        "clicks": int(clicks),
    })

    return {"status": "success"}
