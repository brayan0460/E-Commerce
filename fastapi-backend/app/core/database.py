# app/core/database.py
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool  # <--- NUEVA IMPORTACIÓN OBLIGATORIA

load_dotenv()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "miapp_db")

if DB_PASSWORD:
    credentials = f"{DB_USER}:{DB_PASSWORD}"
else:
    credentials = f"{DB_USER}"

DATABASE_URL = f"mysql+aiomysql://{credentials}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# REGLA DE INFRAESTRUCTURA: poolclass=NullPool destruye la conexión tras usarla, 
# evitando el reciclaje de conexiones corruptas (HTTP 500 intermitente).
engine = create_async_engine(
    DATABASE_URL, 
    echo=True, 
    poolclass=NullPool  # <--- APLICAR ESTE PARÁMETRO
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()