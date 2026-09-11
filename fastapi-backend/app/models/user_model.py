from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    # "admin" puede gestionar productos y ver todos los pedidos; "cliente" solo compra.
    # El primer usuario que se registra en el sistema se vuelve admin automáticamente.
    role = Column(String(20), nullable=False, default="cliente")
