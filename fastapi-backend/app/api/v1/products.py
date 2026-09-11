# app/api/v1/products.py
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.uploads import save_product_image, delete_product_image
from app.models.product_model import Product
from app.models.user_model import User
from app.schemas.product_schema import ProductResponse
from app.api.deps import get_current_admin

router = APIRouter(prefix="/products", tags=["Productos"])


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        query = select(Product).where(Product.is_available.is_(True))
        if search:
            query = query.where(Product.name.ilike(f"%{search}%"))
        if category:
            query = query.where(Product.category == category)
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        print(f"[Error interno en /products/]: {e}")
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {str(e)}")


@router.get("/admin/all", response_model=List[ProductResponse])
async def list_all_products_admin(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Listado completo (incluye productos despublicados) para el panel de administración."""
    result = await db.execute(select(Product).order_by(Product.id.desc()))
    return result.scalars().all()


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(..., max_length=150),
    description: Optional[str] = Form(None),
    price: float = Form(..., gt=0),
    stock: int = Form(..., ge=0),
    category: str = Form(..., max_length=50),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    image_url = await save_product_image(image) if image is not None else None

    new_product = Product(
        name=name,
        description=description,
        price=price,
        stock=stock,
        category=category,
        image_url=image_url,
    )
    db.add(new_product)
    try:
        await db.commit()
        await db.refresh(new_product)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error de persistencia de datos.")
    return new_product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: str = Form(..., max_length=150),
    description: Optional[str] = Form(None),
    price: float = Form(..., gt=0),
    stock: int = Form(..., ge=0),
    category: str = Form(..., max_length=50),
    is_available: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    previous_image_url = product.image_url
    if image is not None:
        product.image_url = await save_product_image(image)

    product.name = name
    product.description = description
    product.price = price
    product.stock = stock
    product.category = category
    product.is_available = is_available

    try:
        await db.commit()
        await db.refresh(product)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error de persistencia de datos.")

    if image is not None and previous_image_url != product.image_url:
        delete_product_image(previous_image_url)

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    image_url = product.image_url
    await db.delete(product)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error al eliminar el producto.")

    delete_product_image(image_url)
