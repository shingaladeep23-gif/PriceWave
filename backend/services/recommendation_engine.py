from typing import List
from ..database import get_db
from ..models import db_models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import redis.asyncio as redis
from ..config import settings

class RecommendationEngine:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)

    async def get_recommendations(self, db: AsyncSession, user_id: int):
        # 1. Get user's recent events
        result = await db.execute(select(db_models.Event).filter(db_models.Event.user_id == user_id).order_by(db_models.Event.timestamp.desc()).limit(10))
        recent_events = result.scalars().all()
        
        if not recent_events:
            # Fallback to trending products
            trending_result = await db.execute(select(db_models.Product).order_by(db_models.Product.current_price.desc()).limit(10))
            return trending_result.scalars().all()
            
        recent_product_ids = [event.product_id for event in recent_events]
        recent_categories_result = await db.execute(select(db_models.Product.category).filter(db_models.Product.id.in_(recent_product_ids)))
        categories = list(set(recent_categories_result.scalars().all()))
        
        # 2. Get popular products in those categories
        recommendations_result = await db.execute(
            select(db_models.Product)
            .filter(db_models.Product.category.in_(categories))
            .filter(~db_models.Product.id.in_(recent_product_ids))
            .limit(10)
        )
        return recommendations_result.scalars().all()

recommendation_engine = RecommendationEngine(settings.REDIS_URL)
