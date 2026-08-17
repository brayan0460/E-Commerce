# app/models/product_model.py
# ==============================================================================
# EXPLICACIÓN TÉCNICA (ARQUITECTURA DE DATOS):
# - Se define la estructura física de la tabla 'products' en MySQL.
# - Se utilizan índices (index=True) en columnas críticas como 'category'
#   para optimizar los tiempos de búsqueda cuando el frontend filtre por tipo de ropa.
# - 'price' se define como Float. En sistemas financieros estrictos de alto 
#   volumen se usaría Numeric/Decimal para evitar errores de coma flotante, 
#   pero para este alcance transaccional inicial, Float es suficiente.
# ==============================================================================
from sqlalchemy import Column, Integer, String, Float, Text, Boolean
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    category = Column(String(50), nullable=False, index=True)
    image_url = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)