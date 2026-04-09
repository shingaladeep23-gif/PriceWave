import redis.asyncio as redis
from ..config import settings
from ..models import db_models
from sqlalchemy.ext.asyncio import AsyncSession
import joblib
import pandas as pd
import os

class PricingEngine:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        model_path = os.path.join(os.path.dirname(__file__), 'pricing_model.joblib')
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            self.model = None

    async def get_ai_prediction(self, product_id: int, stock: int, base_price: float):
        clicks = int(await self.redis.get(f"product:{product_id}:clicks") or 0)
        views = int(await self.redis.get(f"product:{product_id}:views") or 0)
        
        if not self.model:
            # Fallback naive logic if model somehow fails to load
            return 1.0

        features = pd.DataFrame([{
            'clicks': clicks,
            'views': views,
            'stock': stock,
            'base_price': base_price
        }])
        multiplier = self.model.predict(features)[0]
        return multiplier, clicks, views

    async def update_product_price(self, db: AsyncSession, product: db_models.Product):
        multiplier, _, _ = await self.get_ai_prediction(product.id, product.stock, product.base_price)
        
        new_price = product.base_price * multiplier

        # Hard safety bounds based on user request (0.23x to 2.0x)
        floor = round(product.base_price * 0.23, 2)
        ceil  = round(product.base_price * 2.00, 2)
        product.current_price = max(floor, min(ceil, round(new_price, 2)))

        await db.commit()
        await db.refresh(product)
        return product.current_price

pricing_engine = PricingEngine(settings.REDIS_URL)
