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
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
INDEX_HTML = os.path.join(FRONTEND_DIR, "index.html")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.path.join(STATIC_DIR, "uploads", "products"), exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_startup_migrations(conn)
    yield
    await engine.dispose()


app = FastAPI(title="API Tienda de Ropa", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Imágenes subidas por el panel de administración
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

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
