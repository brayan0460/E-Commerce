# Imagen única: sirve el backend FastAPI y el frontend estático juntos.
FROM python:3.12-slim

WORKDIR /app

COPY fastapi-backend/requirements.txt ./fastapi-backend/requirements.txt
RUN pip install --no-cache-dir -r fastapi-backend/requirements.txt

COPY . .

WORKDIR /app/fastapi-backend

EXPOSE 8000

# Railway (y la mayoría de los PaaS) inyectan la variable PORT en tiempo de
# ejecución; si no existe (ej. docker run local), se usa 8000 por defecto.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
