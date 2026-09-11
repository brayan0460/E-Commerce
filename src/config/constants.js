// Vacío = mismo origen que sirve el sitio (FastAPI sirve frontend + API juntos,
// tanto en desarrollo local como en producción). No hay que tocar esto al desplegar.
export const API_BASE_URL = '';
export const PLACEHOLDER_IMAGE = './assets/images/placeholder.svg';

// El backend sube las imágenes de productos a Firebase Storage y guarda la
// URL pública completa en Product.image_url, así que normalmente no hace
// falta prefijo. Se mantiene el fallback relativo por compatibilidad con
// datos antiguos.
export function resolveImageUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}
