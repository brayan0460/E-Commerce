# app/core/uploads.py
import uuid
from fastapi import HTTPException, UploadFile, status

from app.core.firebase import get_bucket

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
STORAGE_FOLDER = "products"

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


async def save_product_image(file: UploadFile) -> str:
    """Valida y sube la imagen de un producto a Firebase Storage. Devuelve la
    URL pública para almacenar en Product.image_url."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen supera el tamaño máximo permitido (5 MB).",
        )
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo de imagen está vacío.")

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    blob_path = f"{STORAGE_FOLDER}/{filename}"

    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_path)
        blob.upload_from_string(contents, content_type=file.content_type)
        try:
            # Falla si el bucket tiene "uniform bucket-level access" activado;
            # en ese caso el acceso público se controla desde el IAM del
            # bucket (ver README.md) y este error se puede ignorar.
            blob.make_public()
        except Exception:
            pass
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo subir la imagen a Firebase Storage: {e}",
        )

    return blob.public_url


def delete_product_image(image_url: str | None) -> None:
    """Borra de Firebase Storage la imagen anterior de un producto, si
    existe. No lanza excepción si falla, para no romper un update/delete de
    producto por un problema de limpieza de almacenamiento."""
    if not image_url:
        return

    marker = f"/{STORAGE_FOLDER}/"
    if marker not in image_url:
        return

    blob_path = f"{STORAGE_FOLDER}/{image_url.split(marker, 1)[1]}"
    try:
        get_bucket().blob(blob_path).delete()
    except Exception:
        pass
