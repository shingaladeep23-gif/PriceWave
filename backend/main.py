import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from contextlib import asynccontextmanager

from .database import engine, Base, AsyncSessionLocal
from .config import settings
from .routers import auth, products, admin, user, cart, invoice
from .services.websocket_manager import manager
from .models import db_models
from .services.pricing_engine import pricing_engine
from sqlalchemy.future import select

async def run_periodic_pricing_update():
    while True:
        try:
            await asyncio.sleep(10)
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(db_models.Product))
                products = result.scalars().all()
                updates = []
                for product in products:
                    new_price = await pricing_engine.update_product_price(db, product)
                    updates.append({"product_id": product.id, "new_price": new_price})
                
                if updates:
                    await manager.broadcast({
                        "type": "price_update",
                        "updates": updates,
                    })
        except asyncio.CancelledError:
            break
        except Exception as e:
            print("Background pricing task error:", e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Start continuous pricing ticker
    task = asyncio.create_task(run_periodic_pricing_update())
    
    yield
    
    # Shutdown logic
    task.cancel()


app = FastAPI(
    title="PriceWave API",
    description="E-Commerce API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(admin.router)
app.include_router(user.router)
app.include_router(cart.router)
app.include_router(invoice.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    return {"message": "Welcome to PriceWave E-Commerce Engine API"}