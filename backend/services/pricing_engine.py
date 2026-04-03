import redis.asyncio as redis
from ..config import settings
from ..models import db_models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

class PricingEngine:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)

    async def get_demand_factor(self, product_id: int) -> float:
        clicks = int(await self.redis.get(f"product:{product_id}:clicks") or 0)
        views = int(await self.redis.get(f"product:{product_id}:views") or 0)
        return min(0.5, (clicks * 0.05) + (views * 0.01))

    def get_stock_factor(self, stock: int) -> float:
        """Price adjustment based on inventory level.

        Low stock  → scarcity premium (price up).
        High stock → clearance nudge  (price slightly down).
        """
        if stock == 0:
            return 0.0          # out of stock — no price change needed
        elif stock < 2:
            return 0.20         # +20 % scarcity premium
        elif stock < 5:
            return 0.10         # +10 % low-stock premium
        elif stock < 10:
            return 0.05         # +5 % mildly low
        elif stock >= 50:
            return -0.03        # -3 % excess-inventory nudge
        return 0.0

    async def update_product_price(self, db: AsyncSession, product: db_models.Product):
        demand_factor = await self.get_demand_factor(product.id)
        stock_factor  = self.get_stock_factor(product.stock)
        decay_factor  = 0.02

        combined  = demand_factor + stock_factor - decay_factor
        new_price = product.base_price * (1 + combined)

        # Allow up to 5 % below base (high-stock discount), cap at 2× base
        floor = round(product.base_price * 0.95, 2)
        ceil  = round(product.base_price * 2.00, 2)
        product.current_price = max(floor, min(ceil, round(new_price, 2)))

        await db.commit()
        await db.refresh(product)
        return product.current_price

pricing_engine = PricingEngine(settings.REDIS_URL)
