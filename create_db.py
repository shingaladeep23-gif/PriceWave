import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from backend.database import engine, Base
from backend.models import db_models

# Explicitly ensure models are registered
_ = [db_models.User, db_models.Product, db_models.CartItem, db_models.Event,
     db_models.Order, db_models.OrderItem, db_models.Address, db_models.Wishlist]

async def main():
    print("Connecting to engine...")
    async with engine.begin() as conn:
        print("Running SQL for table creation...")
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(main())
