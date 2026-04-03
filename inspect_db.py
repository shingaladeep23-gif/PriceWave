import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from backend.database import engine, Base
from backend.models import db_models
from sqlalchemy import text

# Load models
_ = [db_models.User, db_models.Product, db_models.CartItem, db_models.Event]

async def inspect():
    print("Inspecting...")
    async with engine.connect() as conn:
        # Check tables
        result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = result.scalars().all()
        print(f"Tables found: {tables}")

        if "products" in tables:
            result = await conn.execute(text("SELECT id, name, current_price FROM products LIMIT 5;"))
            products = result.all()
            print(f"Products in DB: {products}")
        
        if "users" in tables:
            result = await conn.execute(text("SELECT id, email, role FROM users LIMIT 5;"))
            users = result.all()
            print(f"Users in DB: {users}")

if __name__ == "__main__":
    asyncio.run(inspect())
