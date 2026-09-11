// Vacío = mismo origen que sirve el sitio (FastAPI sirve frontend + API juntos,
// tanto en desarrollo local como en producción). No hay que tocar esto al desplegar.
export const API_BASE_URL = '';
export const PLACEHOLDER_IMAGE = './assets/images/placeholder.svg';

// El backend guarda las imágenes subidas como rutas relativas (/static/...).
// Si en algún momento se usa una URL externa completa, se respeta tal cual.
export function resolveImageUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}
