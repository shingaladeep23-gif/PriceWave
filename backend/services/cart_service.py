from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models import db_models, schemas
from fastapi import HTTPException
from sqlalchemy.orm import joinedload
import uuid
import json


class CartService:
    async def get_cart(self, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(db_models.CartItem)
            .options(joinedload(db_models.CartItem.product))
            .filter(db_models.CartItem.user_id == user_id)
        )
        items = result.scalars().all()
        item_list = []
        grand_total = 0
        for item in items:
            total = (item.price_at_time or 0) * item.quantity
            grand_total += total
            item_list.append({
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                "image_url": item.product.image_url if item.product else None,
                "quantity": item.quantity,
                "price_at_time": item.price_at_time,
                "total": total
            })
        return {"items": item_list, "grand_total": grand_total}

    async def add_to_cart(self, db: AsyncSession, user_id: int, cart_item: schemas.CartItemBase):
        print(f"ADD TO CART: user={user_id}, product={cart_item.product_id}, qty={cart_item.quantity}")

        result = await db.execute(
            select(db_models.Product).filter(db_models.Product.id == cart_item.product_id)
        )
        product = result.scalars().first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if product.stock == 0:
            raise HTTPException(status_code=400, detail="This product is out of stock.")

        result = await db.execute(
            select(db_models.CartItem).filter(
                db_models.CartItem.user_id == user_id,
                db_models.CartItem.product_id == cart_item.product_id
            )
        )
        db_cart_item = result.scalars().first()

        already_in_cart = db_cart_item.quantity if db_cart_item else 0
        total_requested = already_in_cart + cart_item.quantity
        if product.stock < total_requested:
            available = max(0, product.stock - already_in_cart)
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock. Only {available} more unit(s) can be added (stock: {product.stock})."
            )

        if db_cart_item:
            db_cart_item.quantity += cart_item.quantity
            if db_cart_item.price_at_time is None:
                db_cart_item.price_at_time = product.current_price
        else:
            db_cart_item = db_models.CartItem(
                user_id=user_id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                price_at_time=product.current_price,
            )
            db.add(db_cart_item)

        # Record ADD_TO_CART event for analytics
        add_event = db_models.Event(
            user_id=user_id,
            product_id=cart_item.product_id,
            event_type=db_models.EventType.ADD_TO_CART
        )
        db.add(add_event)

        await db.commit()
        return {"status": "added", "product_id": cart_item.product_id}

    async def update_quantity(self, db: AsyncSession, user_id: int, product_id: int, quantity: int):
        result = await db.execute(
            select(db_models.CartItem).filter(
                db_models.CartItem.user_id == user_id,
                db_models.CartItem.product_id == product_id
            )
        )
        db_cart_item = result.scalars().first()
        if not db_cart_item:
            raise HTTPException(status_code=404, detail="Cart item not found")

        if quantity <= 0:
            await db.delete(db_cart_item)
        else:
            # Stock check before allowing quantity increase
            prod_result = await db.execute(
                select(db_models.Product).filter(db_models.Product.id == product_id)
            )
            product = prod_result.scalars().first()
            if product and product.stock < quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock. Only {product.stock} unit(s) available."
                )
            db_cart_item.quantity = quantity

        await db.commit()
        return {"status": "updated", "quantity": quantity}

    async def remove_from_cart(self, db: AsyncSession, user_id: int, product_id: int):
        result = await db.execute(
            select(db_models.CartItem).filter(
                db_models.CartItem.user_id == user_id,
                db_models.CartItem.product_id == product_id
            )
        )
        db_cart_item = result.scalars().first()
        if not db_cart_item:
            raise HTTPException(status_code=404, detail="Cart item not found")

        await db.delete(db_cart_item)
        await db.commit()
        return {"status": "removed"}

    async def checkout(self, db: AsyncSession, user_id: int, address_id: int = None):
        result = await db.execute(
            select(db_models.CartItem).filter(db_models.CartItem.user_id == user_id)
        )
        cart_items = result.scalars().all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        total_amount = sum((item.price_at_time or 0) * item.quantity for item in cart_items)

        # Resolve delivery address
        delivery_address_json = None
        if address_id:
            addr_result = await db.execute(
                select(db_models.Address).where(db_models.Address.id == address_id)
            )
            addr = addr_result.scalars().first()
            if addr:
                delivery_address_json = json.dumps({
                    "name": addr.name,
                    "phone": addr.phone,
                    "address_line": addr.address_line,
                    "city": addr.city,
                    "state": addr.state,
                    "pincode": addr.pincode,
                })

        # Create Order record
        order = db_models.Order(
            user_id=user_id,
            total_amount=total_amount,
            delivery_address=delivery_address_json,
        )
        db.add(order)
        await db.flush()  # populate order.id

        for item in cart_items:
            # Persist each item in the order
            db.add(db_models.OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_time=item.price_at_time or 0,
            ))
            # Analytics event
            db.add(db_models.Event(
                user_id=user_id,
                product_id=item.product_id,
                event_type=db_models.EventType.PURCHASE,
            ))
            # Decrement stock
            prod_result = await db.execute(
                select(db_models.Product).filter(db_models.Product.id == item.product_id)
            )
            product = prod_result.scalars().first()
            if product:
                product.stock = max(0, product.stock - item.quantity)
            await db.delete(item)

        await db.commit()
        return {"status": "success", "message": "Checkout completed", "order_id": order.id}


cart_service = CartService()
