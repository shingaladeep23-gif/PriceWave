from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .db_models import UserRole, EventType, OrderStatus

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.USER

class UserResponse(UserBase):
    id: int
    name: Optional[str] = None
    role: UserRole
    created_at: datetime
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

class ProductBase(BaseModel):
    name: str
    description: str
    base_price: float
    current_price: float
    stock: int
    category: str
    image_url: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    class Config:
        from_attributes = True

class EventBase(BaseModel):
    product_id: int
    event_type: EventType

class EventResponse(EventBase):
    id: int
    user_id: int
    timestamp: datetime
    class Config:
        from_attributes = True

class CartItemBase(BaseModel):
    product_id: int
    quantity: int

class CartItemResponse(CartItemBase):
    id: int
    product: ProductResponse
    price_at_time: float
    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    items: List[CartItemResponse]
    grand_total: float

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Address schemas ──

class AddressBase(BaseModel):
    name: str
    phone: str
    address_line: str
    city: str
    state: str
    pincode: str
    is_default: bool = False

class AddressCreate(AddressBase):
    user_id: int

class AddressUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_default: Optional[bool] = None

class AddressResponse(AddressBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True


# ── Wishlist schemas ──

class WishlistAdd(BaseModel):
    user_id: int
    product_id: int

class WishlistRemove(BaseModel):
    user_id: int
    product_id: int

class GoogleAuthRequest(BaseModel):
    id_token: str
