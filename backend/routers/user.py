from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from sqlalchemy.orm import joinedload
from typing import List
import json

from ..database import get_db
from ..models import db_models, schemas
from ..services.recommendation_engine import recommendation_engine
from .auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=schemas.UserResponse)
async def get_profile(user: db_models.User = Depends(get_current_user)):
    return user


@router.get("/recommendations", response_model=List[schemas.ProductResponse])
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user)
):
    return await recommendation_engine.get_recommendations(db, user.id)


@router.get("/orders/{user_id}")
async def get_orders(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(db_models.Order)
        .where(db_models.Order.user_id == user_id)
        .order_by(db_models.Order.created_at.desc())
    )
    orders = result.scalars().all()

    output = []
    for order in orders:
        items_result = await db.execute(
            select(db_models.OrderItem)
            .options(joinedload(db_models.OrderItem.product))
            .where(db_models.OrderItem.order_id == order.id)
        )
        items = items_result.scalars().all()
        output.append({
            "order_id": order.id,
            "total_amount": order.total_amount,
            "status": order.status.value if order.status else "processing",
            "created_at": order.created_at.isoformat(),
            "items": [
                {
                    "product_id": item.product_id,
                    "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                    "image_url": item.product.image_url if item.product else None,
                    "quantity": item.quantity,
                    "price": item.price_at_time,
                }
                for item in items
            ],
        })
    return output


@router.get("/analytics/{user_id}")
async def get_user_analytics(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Total orders + total spent
    summary = await db.execute(
        select(
            func.count(db_models.Order.id),
            func.coalesce(func.sum(db_models.Order.total_amount), 0.0),
        ).where(db_models.Order.user_id == user_id)
    )
    total_orders, total_spent = summary.first()

    # Total items bought
    items_agg = await db.execute(
        select(func.coalesce(func.sum(db_models.OrderItem.quantity), 0))
        .select_from(db_models.OrderItem)
        .join(db_models.Order, db_models.OrderItem.order_id == db_models.Order.id)
        .where(db_models.Order.user_id == user_id)
    )
    total_items = items_agg.scalar() or 0

    # Most purchased category
    cat_row = await db.execute(
        select(db_models.Product.category, func.sum(db_models.OrderItem.quantity).label("qty"))
        .select_from(db_models.OrderItem)
        .join(db_models.Order, db_models.OrderItem.order_id == db_models.Order.id)
        .join(db_models.Product, db_models.OrderItem.product_id == db_models.Product.id)
        .where(db_models.Order.user_id == user_id)
        .group_by(db_models.Product.category)
        .order_by(func.sum(db_models.OrderItem.quantity).desc())
        .limit(1)
    )
    cat = cat_row.first()

    return {
        "total_orders": int(total_orders),
        "total_spent": round(float(total_spent), 2),
        "total_items_bought": int(total_items),
        "most_bought_category": cat[0] if cat else None,
    }


# ── Profile Update ──

@router.put("/profile/update")
async def update_profile(
    data: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if data.name is not None:
        user.name = data.name
    if data.email is not None:
        existing = await db.execute(
            select(db_models.User).where(
                and_(db_models.User.email == data.email, db_models.User.id != user.id)
            )
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    await db.commit()
    await db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "created_at": user.created_at.isoformat(),
    }


# ── Order Detail ──

@router.get("/order/{order_id}")
async def get_order_detail(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order).where(db_models.Order.id == order_id)
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    items_result = await db.execute(
        select(db_models.OrderItem)
        .options(joinedload(db_models.OrderItem.product))
        .where(db_models.OrderItem.order_id == order.id)
    )
    items = items_result.scalars().all()

    return {
        "order_id": order.id,
        "total_amount": order.total_amount,
        "status": order.status.value if order.status else "processing",
        "delivery_address": json.loads(order.delivery_address) if order.delivery_address else None,
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                "image_url": item.product.image_url if item.product else None,
                "quantity": item.quantity,
                "price": item.price_at_time,
            }
            for item in items
        ],
    }


# ── Cancel Order ──

@router.put("/order/cancel/{order_id}")
async def cancel_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order).where(db_models.Order.id == order_id)
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    current_status = order.status.value if order.status else "processing"
    if current_status != "processing":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order with status '{current_status}'. Only 'processing' orders can be cancelled."
        )

    order.status = db_models.OrderStatus.CANCELLED

    # Restore stock
    items_result = await db.execute(
        select(db_models.OrderItem).where(db_models.OrderItem.order_id == order.id)
    )
    items = items_result.scalars().all()
    for item in items:
        prod_result = await db.execute(
            select(db_models.Product).where(db_models.Product.id == item.product_id)
        )
        product = prod_result.scalars().first()
        if product:
            product.stock += item.quantity

    await db.commit()
    return {"status": "cancelled", "order_id": order.id}


# ── Address Management ──

@router.get("/addresses/{user_id}")
async def get_addresses(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(db_models.Address)
        .where(db_models.Address.user_id == user_id)
        .order_by(db_models.Address.is_default.desc())
    )
    addresses = result.scalars().all()
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "name": a.name,
            "phone": a.phone,
            "address_line": a.address_line,
            "city": a.city,
            "state": a.state,
            "pincode": a.pincode,
            "is_default": a.is_default,
        }
        for a in addresses
    ]


@router.post("/address/add")
async def add_address(
    data: schemas.AddressCreate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != data.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # If setting as default, unset other defaults
    if data.is_default:
        existing = await db.execute(
            select(db_models.Address).where(
                and_(db_models.Address.user_id == data.user_id, db_models.Address.is_default == True)
            )
        )
        for addr in existing.scalars().all():
            addr.is_default = False

    address = db_models.Address(
        user_id=data.user_id,
        name=data.name,
        phone=data.phone,
        address_line=data.address_line,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        is_default=data.is_default,
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return {
        "id": address.id,
        "user_id": address.user_id,
        "name": address.name,
        "phone": address.phone,
        "address_line": address.address_line,
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "is_default": address.is_default,
    }


@router.put("/address/update/{address_id}")
async def update_address(
    address_id: int,
    data: schemas.AddressUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Address).where(db_models.Address.id == address_id)
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    if address.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)

    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        existing = await db.execute(
            select(db_models.Address).where(
                and_(
                    db_models.Address.user_id == user.id,
                    db_models.Address.is_default == True,
                    db_models.Address.id != address_id,
                )
            )
        )
        for addr in existing.scalars().all():
            addr.is_default = False

    for key, value in update_data.items():
        setattr(address, key, value)

    await db.commit()
    await db.refresh(address)
    return {
        "id": address.id,
        "user_id": address.user_id,
        "name": address.name,
        "phone": address.phone,
        "address_line": address.address_line,
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "is_default": address.is_default,
    }


@router.delete("/address/{address_id}")
async def delete_address(
    address_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Address).where(db_models.Address.id == address_id)
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    if address.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(address)
    await db.commit()
    return {"status": "deleted"}


# ── Wishlist ──

@router.get("/wishlist/{user_id}")
async def get_wishlist(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(db_models.Wishlist)
        .options(joinedload(db_models.Wishlist.product))
        .where(db_models.Wishlist.user_id == user_id)
        .order_by(db_models.Wishlist.added_at.desc())
    )
    items = result.scalars().all()
    return [
        {
            "id": item.id,
            "product_id": item.product_id,
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "product": {
                "id": item.product.id,
                "name": item.product.name,
                "description": item.product.description,
                "base_price": item.product.base_price,
                "current_price": item.product.current_price,
                "stock": item.product.stock,
                "category": item.product.category,
                "image_url": item.product.image_url,
            } if item.product else None,
        }
        for item in items
    ]


@router.post("/wishlist/add")
async def add_to_wishlist(
    data: schemas.WishlistAdd,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != data.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if already in wishlist
    existing = await db.execute(
        select(db_models.Wishlist).where(
            and_(
                db_models.Wishlist.user_id == data.user_id,
                db_models.Wishlist.product_id == data.product_id,
            )
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Already in wishlist")

    # Verify product exists
    prod = await db.execute(
        select(db_models.Product).where(db_models.Product.id == data.product_id)
    )
    if not prod.scalars().first():
        raise HTTPException(status_code=404, detail="Product not found")

    item = db_models.Wishlist(user_id=data.user_id, product_id=data.product_id)
    db.add(item)
    await db.commit()
    return {"status": "added", "product_id": data.product_id}


@router.delete("/wishlist/remove/{user_id}/{product_id}")
async def remove_from_wishlist(
    user_id: int,
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(db_models.Wishlist).where(
            and_(
                db_models.Wishlist.user_id == user_id,
                db_models.Wishlist.product_id == product_id,
            )
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")

    await db.delete(item)
    await db.commit()
    return {"status": "removed"}
