# app/core/database.py
import os
from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool  # <--- NUEVA IMPORTACIÓN OBLIGATORIA

load_dotenv()

# Plataformas como Railway inyectan una URL de conexión lista (DATABASE_URL o
# MYSQL_URL, formato mysql://user:pass@host:port/db). Si existe, se usa tal
# cual (ajustando el driver); si no, se arma desde variables sueltas (uso local).
_provided_url = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")

if _provided_url:
    DATABASE_URL = _provided_url.replace("mysql://", "mysql+aiomysql://", 1)
else:
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "miapp_db")

    credentials = f"{DB_USER}:{DB_PASSWORD}" if DB_PASSWORD else DB_USER
    DATABASE_URL = f"mysql+aiomysql://{credentials}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# REGLA DE INFRAESTRUCTURA: poolclass=NullPool destruye la conexión tras usarla,
# evitando el reciclaje de conexiones corruptas (HTTP 500 intermitente).
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
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


def _add_missing_columns(sync_conn):
    """Migración ligera: agrega columnas nuevas a tablas ya existentes sin
    borrar datos. No usamos Alembic por el tamaño del proyecto; basta con
    detectar columnas ausentes y hacer ALTER TABLE una sola vez."""
    inspector = inspect(sync_conn)
    existing_tables = inspector.get_table_names()

    if "users" in existing_tables:
        user_columns = {c["name"] for c in inspector.get_columns("users")}
        if "role" not in user_columns:
            sync_conn.execute(text(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'cliente'"
            ))


async def run_startup_migrations(conn):
    await conn.run_sync(_add_missing_columns)