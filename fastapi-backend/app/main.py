from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from contextlib import asynccontextmanager
from app.core.database import engine, Base, get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user_model import User
from app.schemas.user_schema import UserCreate, UserResponse
from app.schemas.auth_schema import LoginRequest, TokenResponse
from typing import List
from app.models.product_model import Product
from app.schemas.product_schema import ProductCreate, ProductResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.core.security import SECRET_KEY, ALGORITHM

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token expirado o corrupto")
    
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(title="API Tienda de Ropa", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == user_data.email)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
    
    hashed_pwd = hash_password(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    
    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error interno al guardar usuario.")
        
    return new_user

@app.post("/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == credentials.email)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    access_token = create_access_token(data={"sub": user.email, "id": user.id})
    return TokenResponse(access_token=access_token)

# Endpoints a agregar al final del archivo:
# app/main.py
@app.get("/products/", response_model=List[ProductResponse])
async def list_products(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    try:
        query = select(Product).where(Product.is_available.is_(True)).offset(skip).limit(limit)
        result = await db.execute(query)
        products = result.scalars().all()
        return products
    except Exception as e:
        print(f"[Error interno en /products/]: {e}")
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {str(e)}")

@app.post("/products/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user) # <- Bloqueo de seguridad aquí
):
    new_product = Product(**product_data.model_dump())
    db.add(new_product)
    try:
        await db.commit()
        await db.refresh(new_product)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error de persistencia de datos.")
    return new_product