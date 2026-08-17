// src/views/loginView.js
import { ApiService } from '../services/api.service.js';
import { store } from '../state/store.js';
import { Router } from '../router.js';

export function renderLoginView(container) {
  // 1. Inyectar HTML del formulario
  container.innerHTML = `
    <section class="login-section">
      <div class="login-card">
        <h2>Iniciar Sesión</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <input type="email" id="email" name="email" required placeholder="tu@email.com" />
          </div>
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" name="password" required placeholder="••••••••" />
          </div>
          <div id="login-error" class="error-msg"></div>
          <button type="submit" class="btn-primary" id="btn-submit">Ingresar</button>
        </form>
        <p class="register-prompt">
          ¿No tienes una cuenta? <a href="/register" data-link>Regístrate aquí</a>
        </p>
      </div>
    </section>
  `;

  // 2. Lógica del formulario
  const form = container.querySelector('#login-form');
  const errorDiv = container.querySelector('#login-error');
  const btnSubmit = container.querySelector('#btn-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar que la página se recargue
    
    // Limpiar errores previos y mostrar feedback visual de carga
    errorDiv.textContent = '';
    const originalBtnText = btnSubmit.textContent;
    btnSubmit.textContent = 'Verificando...';
    btnSubmit.disabled = true;

    const email = form.email.value;
    const password = form.password.value;

    try {
      // 3. Petición POST al backend en FastAPI
      const response = await ApiService.post('/auth/login', { email, password });
      
      // 4. Guardar credenciales en el almacenamiento local del navegador
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user_data', JSON.stringify({ email }));

      // 5. Actualizar el estado global (Esto hará que cambie la Navbar automáticamente)
      store.setState({ 
        isAuthenticated: true, 
        token: response.access_token, 
        user: { email } 
      });

      // 6. Redirigir al usuario logueado hacia el catálogo
      Router.navigateTo('/catalogo');

    } catch (error) {
      // Si FastAPI devuelve código 401, caerá aquí
      errorDiv.textContent = error.message || 'Credenciales incorrectas';
    } finally {
      // Restaurar el botón a la normalidad
      btnSubmit.textContent = originalBtnText;
      btnSubmit.disabled = false;
    }
  });
}