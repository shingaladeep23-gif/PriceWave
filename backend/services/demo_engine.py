import asyncio
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database import AsyncSessionLocal
from ..models import db_models
from .pricing_engine import pricing_engine
from .websocket_manager import manager

async def simulate_user_activity():
    """Background task to simulate live user traffic for demo purposes."""
    print("Starting Demo Engine: Simulating user traffic...")
    try:
        while True:
            try:
                async with AsyncSessionLocal() as db:
                    # Logic here... (rest of the loop)
                    result = await db.execute(select(db_models.Product).limit(100))
                    products = result.scalars().all()
                    
                    if products:
                        active_products = random.sample(products, k=min(3, len(products)))
                        for product in active_products:
                            event_type = random.choices(
                                list(db_models.EventType),
                                weights=[0.6, 0.25, 0.1, 0.05],
                                k=1
                            )[0]
                            
                            if event_type == db_models.EventType.VIEW:
                                await pricing_engine.redis.incr(f"product:{product.id}:views")
                            elif event_type == db_models.EventType.CLICK:
                                await pricing_engine.redis.incr(f"product:{product.id}:clicks")
                            
                            new_event = db_models.Event(
                                user_id=1,
                                product_id=product.id,
                                event_type=event_type
                            )
                            db.add(new_event)
                            
                            if random.random() < 0.3:
                                await pricing_engine.update_product_price(db, product)
                                await manager.broadcast({
                                    "type": "PRICE_UPDATE",
                                    "product_id": product.id,
                                    "new_price": product.current_price
                                })

                        await db.commit()
                        await manager.broadcast({"type": "TRAFFIC_SPIKE", "timestamp": str(asyncio.get_event_loop().time())})

                await asyncio.sleep(random.uniform(3, 7))
                
            except Exception as e:
                print(f"Demo Engine Inner Error: {e}")
                await asyncio.sleep(10)
    except asyncio.CancelledError:
        print("Demo Engine shutting down safely...")
