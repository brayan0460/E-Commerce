# app/core/security.py
import os
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

# Sin default inseguro a propósito: si falta, el proceso no debe arrancar en
# ningún entorno (local o producción) en vez de firmar tokens con una clave
# conocida y compartida por todo el que clone el repo.
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "Falta la variable de entorno SECRET_KEY. Genera una con: "
        "python -c \"import secrets; print(secrets.token_hex(32))\" "
        "y agrégala a tu .env (ver fastapi-backend/.env.example)."
    )

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hash_password(password: str) -> str:
    """Genera el hash seguro con bcrypt nativo."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica la contraseña contra el hash almacenado."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
