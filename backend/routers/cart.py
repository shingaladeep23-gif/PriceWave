from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ..database import get_db
from ..models import schemas
from ..services.cart_service import cart_service
from ..services.websocket_manager import manager

router = APIRouter(prefix="/cart", tags=["cart"])


class AddToCartRequest(BaseModel):
    user_id: int
    product_id: int
    quantity: int = 1


@router.post("/add")
async def add_to_cart(req: AddToCartRequest, db: AsyncSession = Depends(get_db)):
    print(f"BACKEND HIT: POST /cart/add user={req.user_id} product={req.product_id}")
    cart_item = schemas.CartItemBase(product_id=req.product_id, quantity=req.quantity)
    result = await cart_service.add_to_cart(db, req.user_id, cart_item)

    await manager.broadcast({
        "type": "cart_update",
        "action": "add",
        "user_id": req.user_id,
        "product_id": req.product_id,
    })

    return result


@router.get("/{user_id}")
async def get_cart(user_id: int, db: AsyncSession = Depends(get_db)):
    print(f"BACKEND HIT: GET /cart/{user_id}")
    return await cart_service.get_cart(db, user_id)


@router.delete("/remove/{user_id}/{product_id}")
async def remove_from_cart(user_id: int, product_id: int, db: AsyncSession = Depends(get_db)):
    return await cart_service.remove_from_cart(db, user_id, product_id)


@router.post("/update/{user_id}")
async def update_quantity(
    user_id: int,
    product_id: int,
    quantity: int,
    db: AsyncSession = Depends(get_db)
):
    return await cart_service.update_quantity(db, user_id, product_id, quantity)


@router.post("/checkout/{user_id}")
async def checkout(user_id: int, address_id: int = None, db: AsyncSession = Depends(get_db)):
    result = await cart_service.checkout(db, user_id, address_id=address_id)

    await manager.broadcast({
        "type": "purchase_completed",
        "user_id": user_id,
        "order_id": result.get("order_id"),
    })

    return result
