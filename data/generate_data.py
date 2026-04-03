import asyncio
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Import models
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import AsyncSessionLocal, engine, Base
from backend.models import db_models

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Beauty", "Sports", "Books", "Toys"]
PRODUCT_TEMPLATES = {
    "Electronics": ["Smartphone", "Laptop", "Headphones", "Smartwatch", "Camera", "Tablet"],
    "Clothing": ["T-Shirt", "Jeans", "Jacket", "Dress", "Sneakers", "Hat"],
    "Home & Garden": ["Coffee Maker", "Vase", "Desk Lamp", "Cushion", "Rug", "Garden Tools"],
    "Beauty": ["Lipstick", "Moisturizer", "Perfume", "Shampoo", "Face Mask", "Mascara"],
    "Sports": ["Yoga Mat", "Dumbbells", "Running Shoes", "Water Bottle", "Backpack", "Tent"],
    "Books": ["Mystery Novel", "Sci-Fi Epic", "Cookbook", "Biography", "History Book", "Philosophy"],
    "Toys": ["Building Blocks", "Puzzle", "Action Figure", "Doll", "Board Game", "RC Car"]
}

async def generate_data():
    async with AsyncSessionLocal() as db:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # 1. Create Admin
        admin_email = "admin@pricewave.com"
        result = await db.execute(select(db_models.User).filter(db_models.User.email == admin_email))
        if not result.scalars().first():
            admin = db_models.User(
                email=admin_email,
                hashed_password=pwd_context.hash("admin123"),
                role=db_models.UserRole.ADMIN
            )
            db.add(admin)
            print("Created Admin User: admin@pricewave.com / admin123")

        # 2. Create Users (Reduced for simplicity)
        print("Generating 50 users...")
        for i in range(50):
            user = db_models.User(
                email=f"user{i}@example.com",
                hashed_password=pwd_context.hash("password123"),
                role=db_models.UserRole.USER
            )
            db.add(user)
        await db.commit()

        # 3. Create Products (Reduced for simplicity)
        print("Generating 100 products...")
        products = []
        for i in range(100):
            category = random.choice(CATEGORIES)
            template = random.choice(PRODUCT_TEMPLATES[category])
            base_price = round(random.uniform(10.0, 1000.0), 2)
            product = db_models.Product(
                name=f"{template} {i}",
                description=f"High-quality {template} in {category} category.",
                base_price=base_price,
                current_price=base_price,
                stock=random.randint(50, 500),
                category=category,
                image_url=f"https://picsum.photos/seed/product{i}/400/300"
            )
            db.add(product)
            products.append(product)
            if i % 100 == 0:
                await db.commit()
        await db.commit()

        # 4. Generate Events
        print("Generating mock events...")
        # Get users and products to link events
        users_result = await db.execute(select(db_models.User).limit(50))
        users = users_result.scalars().all()
        
        for _ in range(500):
            user = random.choice(users)
            product = random.choice(products)
            event_type = random.choice(list(db_models.EventType))
            event = db_models.Event(
                user_id=user.id,
                product_id=product.id,
                event_type=event_type,
                timestamp=datetime.utcnow() - timedelta(days=random.randint(0, 7))
            )
            db.add(event)
        
        await db.commit()
        print("Data generation complete!")

if __name__ == "__main__":
    asyncio.run(generate_data())
