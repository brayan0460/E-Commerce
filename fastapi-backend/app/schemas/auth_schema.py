from pydantic import BaseModel, EmailStr
from app.schemas.user_schema import UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # Se incluye el usuario para que el frontend conozca su rol sin una petición extra.
    user: UserResponse
