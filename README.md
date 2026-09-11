# E-Commerce

Tienda de ropa: frontend en JavaScript vanilla (sin build step) servido por
el mismo proceso FastAPI que expone la API. Se despliega como un único
servicio (imagen Docker).

## Arquitectura

- `index.html`, `src/`, `assets/` — frontend (SPA con router propio basado en
  `pushState`, sin framework ni bundler).
- `fastapi-backend/` — API REST (FastAPI + SQLAlchemy async + MySQL).
- `fastapi-backend/app/main.py` sirve el frontend y monta la API en el mismo
  origen (`/auth`, `/products`, `/orders`), por lo que no hay CORS que
  configurar entre ellos en producción.
- Las imágenes de productos se suben a **Firebase Storage** desde el backend
  (`app/core/firebase.py`, `app/core/uploads.py`); no se guardan en disco
  local, porque el disco de la mayoría de plataformas de hosting (Railway,
  Docker sin volumen, etc.) es efímero.

## Requisitos

- Python 3.12+
- MySQL accesible (local o remoto)
- Un proyecto de Firebase con Storage habilitado (solo para subir imágenes
  de productos)

## Configuración local

1. Copia `fastapi-backend/.env.example` a `fastapi-backend/.env` y completa
   los valores (ver detalle de cada variable abajo).
2. Crea el entorno virtual e instala dependencias:
   ```
   cd fastapi-backend
   python -m venv .venv
   .venv/Scripts/activate   # Windows
   pip install -r requirements.txt
   ```
3. Levanta el servidor:
   ```
   uvicorn app.main:app --reload
   ```
4. Abre `http://127.0.0.1:8000` — sirve el frontend y la API juntos. El
   primer usuario que se registre (`/register`) queda como `admin`
   automáticamente; desde ahí puedes entrar a `/admin` para cargar
   productos.

Las tablas de MySQL se crean solas al arrancar (`Base.metadata.create_all`
en el `lifespan` de `main.py`); no hace falta migrarlas a mano.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` / `MYSQL_URL` | En producción (o las sueltas de abajo en local) | URL de conexión lista, formato `mysql://user:pass@host:puerto/db` (la inyectan Railway y PaaS similares). |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | Si no hay `DATABASE_URL` | Datos de conexión sueltos, para desarrollo local. |
| `SECRET_KEY` | **Sí, siempre** | Clave para firmar los JWT. Sin ella la app **no arranca** (a propósito: antes tenía un valor por defecto inseguro). Generar con `python -c "import secrets; print(secrets.token_hex(32))"`. |
| `ALGORITHM` | No (default `HS256`) | Algoritmo de firma JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No (default `60`) | Minutos de validez del token. |
| `ALLOWED_ORIGINS` | No (default vacío) | Orígenes CORS permitidos, separados por coma. Vacío = solo same-origin, que es el caso normal en producción. Solo hace falta si sirves el frontend desde un origen distinto al backend (ej. Live Server en desarrollo). |
| `FIREBASE_STORAGE_BUCKET` | **Sí** | Nombre del bucket de Firebase Storage, ej. `tu-proyecto.appspot.com`. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Una de las dos (con `FIREBASE_SERVICE_ACCOUNT_JSON`) | Ruta local a un archivo `.json` del service account de Firebase. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Una de las dos (con `GOOGLE_APPLICATION_CREDENTIALS`) | El contenido de ese mismo `.json`, pegado como string. Tiene prioridad sobre `GOOGLE_APPLICATION_CREDENTIALS`; pensado para plataformas donde solo puedes definir variables de entorno (Railway, etc.), no subir archivos. |

## Configurar Firebase Storage

1. En la [consola de Firebase](https://console.firebase.google.com/), crea un
   proyecto (o usa uno existente) y habilita **Storage**.
2. Anota el nombre del bucket (Storage → apartado superior, algo como
   `tu-proyecto.appspot.com`) → variable `FIREBASE_STORAGE_BUCKET`.
3. Genera credenciales de servidor: *Configuración del proyecto → Cuentas de
   servicio → Generar nueva clave privada*. Descarga el `.json`.
   - **Desarrollo local:** guarda ese archivo como
     `fastapi-backend/firebase-service-account.json` (ya está en
     `.gitignore`, no se commitea) y define
     `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json` en tu
     `.env`.
   - **Producción (Railway u otra plataforma sin subida de archivos):** pega
     el contenido completo del `.json` en la variable de entorno
     `FIREBASE_SERVICE_ACCOUNT_JSON`.
4. Acceso público a las imágenes: el backend llama a `blob.make_public()`
   al subir cada imagen. Si tu bucket tiene **"uniform bucket-level
   access"** activado (por defecto en buckets nuevos), esa llamada falla
   silenciosamente y en vez de eso debes dar acceso público a nivel de
   bucket: *Storage → Permisos → Otorgar acceso → principal `allUsers`,
   rol `Storage Object Viewer`*.
5. No hace falta tocar nada del frontend: `Product.image_url` guarda la URL
   pública completa que devuelve Firebase, y `resolveImageUrl()` en
   `src/config/constants.js` ya sabe usar URLs absolutas tal cual.

> Nota de migración: si ya tenías productos con imágenes subidas al disco
> local (rutas `/static/uploads/...`, del código anterior a este cambio),
> esas imágenes dejaron de servirse. Vuelve a subirlas desde el panel de
> administración (`/admin`) una vez configurado Firebase Storage.

## Despliegue (Docker / Railway o similar)

El `Dockerfile` en la raíz arma una sola imagen que sirve frontend + API:

```
docker build -t ecommerce .
docker run -p 8000:8000 --env-file fastapi-backend/.env ecommerce
```

En una plataforma tipo Railway:

1. Conecta el repo, que detecte el `Dockerfile`.
2. Agrega un plugin de MySQL (o usa uno externo) — Railway inyecta
   `DATABASE_URL`/`MYSQL_URL` automáticamente.
3. Define en las variables de entorno del servicio: `SECRET_KEY`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_JSON` (y
   `ALLOWED_ORIGINS` solo si el frontend fuera a vivir en otro dominio).
4. La plataforma inyecta `PORT` en tiempo de ejecución; el `CMD` del
   Dockerfile ya lo respeta (`--port ${PORT:-8000}`).

## Notas de seguridad

- La autenticación usa JWT por header `Authorization: Bearer <token>` (no
  cookies), así que CORS no necesita `allow_credentials`.
- El primer usuario registrado en la base de datos queda como `admin`
  automáticamente (`app/api/v1/auth.py`). En un despliegue nuevo, regístrate
  tú primero antes de compartir la URL.
