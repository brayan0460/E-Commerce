// src/services/api.service.js
// ==============================================================================
// SERVICIO CENTRALIZADO DE PETICIONES HTTP (INTERCEPTOR JWT)
// ==============================================================================
// - Extrae automáticamente el token JWT desde localStorage.
// - Inyecta la cabecera 'Authorization: Bearer <token>' si el usuario está autenticado.
// - Centraliza el manejo de errores HTTP y el parseo de respuestas JSON.
// ==============================================================================

import { API_BASE_URL } from '../config/constants.js';

export class ApiService {
  static async request(endpoint, options = {}) {
    // 1. Cabeceras por defecto
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    // 2. Interceptor: Obtener el token y adjuntarlo si existe
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      // Si el backend responde con 401 Unauthorized, el token expiró o es inválido
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Error HTTP ${response.status}`);
      }

      // Si la respuesta no tiene contenido (ej. status 204)
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[ApiService Error] ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  static get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  static post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  }

  static put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
  }

  static delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}