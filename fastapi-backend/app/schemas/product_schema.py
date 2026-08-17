# app/schemas/product_schema.py
# ==============================================================================
# EXPLICACIÓN TÉCNICA (CAPA DE VALIDACIÓN - DTOs):
# - Se utiliza herencia (ProductBase) para no repetir código entre la
#   creación y la lectura de productos.
# - Field(...) asegura validaciones estrictas de entrada (ej: precio > 0, stock >= 0).
#   Si el cliente envía datos malformados, Pydantic bloquea la petición 
#   automáticamente con un error 422 antes de procesar la lógica de negocio.
# ==============================================================================
from pydantic import BaseModel, Field
from typing import Optional

class ProductBase(BaseModel):
    name: str = Field(..., max_length=150)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    category: str = Field(..., max_length=50)
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    is_available: bool

    model_config = {"from_attributes": True}