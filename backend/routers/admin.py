from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Dict
import redis.asyncio as redis
import random

from ..database import get_db
from ..models import db_models, schemas
from ..config import settings
from .auth import get_current_admin
from ..services.pricing_engine import pricing_engine
from ..services.websocket_manager import manager

router = APIRouter(prefix="/admin", tags=["admin"])
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

from datetime import datetime, timedelta

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    result = await db.execute(select(db_models.Product).limit(50))
    products = result.scalars().all()

    purchase_result = await db.execute(
        select(db_models.Event.product_id, func.count(db_models.Event.id))
        .where(db_models.Event.event_type == db_models.EventType.PURCHASE)
        .group_by(db_models.Event.product_id)
    )
    purchase_counts = {row[0]: row[1] for row in purchase_result.all()}

    stats = []
    for product in products:
        clicks = await redis_client.get(f"product:{product.id}:clicks") or 0
        views  = await redis_client.get(f"product:{product.id}:views")  or 0
        demand_factor = await pricing_engine.get_demand_factor(product.id)
        stock_factor  = pricing_engine.get_stock_factor(product.stock)
        stats.append({
            "product_id":   product.id,
            "name":         product.name,
            "clicks":       int(clicks),
            "views":        int(views),
            "purchases":    purchase_counts.get(product.id, 0),
            "current_price": product.current_price,
            "base_price":   product.base_price,
            "demand_score": round(demand_factor * 100, 2),
            "stock":        product.stock,
            "stock_factor": round(stock_factor * 100, 1),
        })
    return stats

@router.post("/pricing/recalculate")
async def recalculate_prices(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    result = await db.execute(select(db_models.Product))
    products = result.scalars().all()
    updates = []
    for product in products:
        new_price = await pricing_engine.update_product_price(db, product)
        updates.append({"product_id": product.id, "new_price": new_price})

    # Broadcast all price updates to connected clients
    await manager.broadcast({
        "type": "price_update",
        "updates": updates,
    })

    return {"status": "success", "updates": updates}

@router.get("/analytics/overview")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    result = await db.execute(
        select(db_models.Event.event_type, func.count(db_models.Event.id))
        .group_by(db_models.Event.event_type)
    )
    event_stats = {row[0]: row[1] for row in result.all()}

    purchases = event_stats.get(db_models.EventType.PURCHASE, 0)
    clicks    = event_stats.get(db_models.EventType.CLICK, 0)
    conv_rate = round((purchases / clicks * 100), 2) if clicks > 0 else 0

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(db_models.Product.current_price), 0.0))
        .select_from(db_models.Event)
        .join(db_models.Product, db_models.Event.product_id == db_models.Product.id)
        .where(db_models.Event.event_type == db_models.EventType.PURCHASE)
    )
    revenue = revenue_result.scalar() or 0.0

    # Inventory summary
    inv_result = await db.execute(
        select(
            func.count(db_models.Product.id),
            func.coalesce(func.sum(db_models.Product.stock), 0),
        )
    )
    total_products, total_stock = inv_result.first()

    low_stock_result = await db.execute(
        select(func.count(db_models.Product.id))
        .where(db_models.Product.stock < 10)
        .where(db_models.Product.stock > 0)
    )
    low_stock_count = low_stock_result.scalar() or 0

    oos_result = await db.execute(
        select(func.count(db_models.Product.id))
        .where(db_models.Product.stock == 0)
    )
    oos_count = oos_result.scalar() or 0

    return {
        "total_clicks":     clicks,
        "total_purchases":  purchases,
        "total_add_to_cart": event_stats.get(db_models.EventType.ADD_TO_CART, 0),
        "total_revenue":    round(revenue, 2),
        "conversion_rate":  conv_rate,
        "total_products":   total_products,
        "total_stock":      total_stock,
        "low_stock_count":  low_stock_count,
        "out_of_stock_count": oos_count,
    }

def _traffic_query(since):
    return (
        select(
            func.strftime('%H:%M', db_models.Event.timestamp).label('minute'),
            func.count(db_models.Event.id)
        )
        .where(db_models.Event.timestamp >= since)
        .group_by('minute')
        .order_by('minute')
    )

@router.get("/analytics/trends")
async def get_analytics_trends(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    now = datetime.utcnow()
    result = await db.execute(_traffic_query(now - timedelta(minutes=30)))
    return [{"time": row[0], "count": row[1]} for row in result.all()]

@router.get("/analytics/traffic")
async def get_analytics_traffic(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    now = datetime.utcnow()
    result = await db.execute(_traffic_query(now - timedelta(minutes=30)))
    return [{"time": row[0], "count": row[1]} for row in result.all()]

@router.get("/pricing/explain/{product_id}")
async def explain_pricing(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    result = await db.execute(select(db_models.Product).where(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    demand_factor = await pricing_engine.get_demand_factor(product.id)
    stock_factor  = pricing_engine.get_stock_factor(product.stock)
    decay_factor  = 0.02
    multiplier    = 1 + demand_factor + stock_factor - decay_factor

    events_result = await db.execute(
        select(db_models.Event.event_type, func.count(db_models.Event.id))
        .where(db_models.Event.product_id == product_id)
        .group_by(db_models.Event.event_type)
    )
    event_counts = {row[0]: row[1] for row in events_result.all()}

    return {
        "product_id":    product.id,
        "name":          product.name,
        "base_price":    product.base_price,
        "current_price": product.current_price,
        "stock":         product.stock,
        "demand_factor": round(demand_factor, 4),
        "demand_score":  round(demand_factor * 100, 2),
        "stock_factor":  round(stock_factor, 4),
        "stock_factor_pct": round(stock_factor * 100, 1),
        "decay_factor":  decay_factor,
        "multiplier":    round(multiplier, 4),
        "views":         event_counts.get(db_models.EventType.VIEW, 0),
        "clicks":        event_counts.get(db_models.EventType.CLICK, 0),
        "add_to_cart":   event_counts.get(db_models.EventType.ADD_TO_CART, 0),
        "purchases":     event_counts.get(db_models.EventType.PURCHASE, 0),
    }

@router.post("/inventory/restock")
async def restock_inventory(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    """Simulate a restock delivery — adds 20–50 units to every product, capped at 200."""
    result = await db.execute(select(db_models.Product))
    products = result.scalars().all()
    restocked = []
    for product in products:
        added = random.randint(20, 50)
        product.stock = min(product.stock + added, 200)
        restocked.append({"product_id": product.id, "name": product.name, "new_stock": product.stock})
    await db.commit()

    await manager.broadcast({
        "type": "inventory_update",
        "restocked": restocked,
    })

    return {"status": "success", "restocked_count": len(restocked), "products": restocked}

@router.get("/inventory/status")
async def get_inventory_status(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin)
):
    """Returns every product's current stock level for the inventory panel."""
    result = await db.execute(
        select(db_models.Product.id, db_models.Product.name, db_models.Product.stock, db_models.Product.category)
        .order_by(db_models.Product.stock.asc())
    )
    rows = result.all()
    return [
        {
            "product_id": r[0],
            "name":       r[1],
            "stock":      r[2],
            "category":   r[3],
            "status": "out_of_stock" if r[2] == 0
                      else "critical" if r[2] < 5
                      else "low" if r[2] < 10
                      else "normal",
        }
        for r in rows
    ]
