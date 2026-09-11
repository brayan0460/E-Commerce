import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.database import engine, Base, run_startup_migrations
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.orders import router as orders_router

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))  # .../fastapi-backend
# El proyecto es un monorepo: el frontend (index.html, src/, assets/) vive un
# nivel arriba de fastapi-backend/. Servirlo desde el mismo proceso FastAPI
# evita CORS y permite desplegar todo como un único servicio (más barato/simple).
FRONTEND_DIR = os.path.dirname(BACKEND_DIR)
INDEX_HTML = os.path.join(FRONTEND_DIR, "index.html")

ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_startup_migrations(conn)
    yield
    await engine.dispose()


app = FastAPI(title="API Tienda de Ropa", version="1.1.0", lifespan=lifespan)

# El frontend consume la API desde el mismo origen (ver src/config/constants.js),
# así que en producción no se necesitan orígenes cruzados: ALLOWED_ORIGINS queda
# vacío por defecto y CORS solo se abre si se define explícitamente (útil para
# levantar el frontend con un dev server aparte, ej. Live Server en :5500).
# No usamos allow_credentials porque la autenticación va por header
# Authorization (Bearer), no por cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de la API (deben registrarse antes que el catch-all del frontend)
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(orders_router)

# Archivos estáticos del frontend (JS/CSS/imágenes propias del sitio)
app.mount("/src", StaticFiles(directory=os.path.join(FRONTEND_DIR, "src")), name="frontend-src")
app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="frontend-assets")


@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(INDEX_HTML)


# Fallback de SPA: cualquier ruta que no sea de la API ni un archivo estático
# devuelve index.html para que el router del frontend (basado en pushState)
# la resuelva. Así /admin, /perfil, /cart, etc. funcionan también al recargar
# la página directamente, no solo navegando por clics dentro de la app.
@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    return FileResponse(INDEX_HTML)
