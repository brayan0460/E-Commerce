# app/api/v1/orders.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.order_model import Order, OrderItem
from app.models.product_model import Product
from app.models.user_model import User
from app.schemas.order_schema import OrderCheckoutRequest, OrderResponse, OrderAdminResponse
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/orders", tags=["Pedidos"])


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: OrderCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = 0.0
    order_items = []

    for item in payload.items:
        product = await db.get(Product, item.product_id)
        if product is None or not product.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El producto con id {item.product_id} ya no está disponible.",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente para '{product.name}' (disponible: {product.stock}).",
            )

        product.stock -= item.quantity
        total += product.price * item.quantity
        order_items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            unit_price=product.price,
            quantity=item.quantity,
        ))

    new_order = Order(user_id=current_user.id, total=total, items=order_items)
    db.add(new_order)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error al procesar el pedido.")

    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == new_order.id)
    )
    return result.scalar_one()


@router.get("/me", response_model=List[OrderResponse])
async def my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()


@router.get("/", response_model=List[OrderAdminResponse])
async def list_all_orders(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()
