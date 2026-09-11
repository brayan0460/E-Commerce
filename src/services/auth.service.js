// src/services/auth.service.js
// Centraliza el manejo de sesión: guardar/leer token y datos de usuario,
// y mantener sincronizado el estado global (store) tras login/registro/logout.
import { ApiService } from './api.service.js';
import { store } from '../state/store.js';

export class AuthService {
  static async login(email, password) {
    const response = await ApiService.post('/auth/login', { email, password });
    this._persistSession(response);
    return response.user;
  }

  static async register(email, password) {
    return ApiService.post('/auth/register', { email, password });
  }

  static logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    store.setState({ isAuthenticated: false, user: null, token: null });
  }

  static isAdmin() {
    return store.getState().user?.role === 'admin';
  }

  static _persistSession(response) {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user_data', JSON.stringify(response.user));

    store.setState({
      isAuthenticated: true,
      token: response.access_token,
      user: response.user
    });
  }
}
