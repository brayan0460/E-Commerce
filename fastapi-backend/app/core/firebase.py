# app/core/firebase.py
# Inicialización perezosa de Firebase Admin (solo Storage) para alojar las
# imágenes de productos. Soporta dos formas de credenciales para no depender
# de subir un archivo al servidor de hosting:
#   - FIREBASE_SERVICE_ACCOUNT_JSON: contenido completo del service account
#     key como string JSON (ideal para plataformas que solo aceptan variables
#     de entorno, ej. Railway).
#   - GOOGLE_APPLICATION_CREDENTIALS: ruta a un archivo .json local (uso en
#     desarrollo).
import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, storage


def _load_credentials():
    raw_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw_json:
        return credentials.Certificate(json.loads(raw_json))

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        return credentials.Certificate(cred_path)

    raise RuntimeError(
        "Faltan credenciales de Firebase. Define FIREBASE_SERVICE_ACCOUNT_JSON "
        "(el contenido del service account key como string JSON) o "
        "GOOGLE_APPLICATION_CREDENTIALS (ruta a ese archivo .json). Ver "
        "fastapi-backend/.env.example y README.md."
    )


@lru_cache
def get_bucket():
    """Inicializa la app de Firebase Admin una sola vez por proceso y
    devuelve el bucket de Storage configurado."""
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket_name:
        raise RuntimeError("Falta la variable de entorno FIREBASE_STORAGE_BUCKET.")

    if not firebase_admin._apps:
        firebase_admin.initialize_app(_load_credentials(), {"storageBucket": bucket_name})

    return storage.bucket()
