// src/views/registerView.js
import { ApiService } from '../services/api.service.js';
import { store } from '../state/store.js';
import { Router } from '../router.js';

export function renderRegisterView(container) {
  container.innerHTML = `
    <section class="login-section">
      <div class="login-card">
        <h2>Crear Cuenta</h2>
        <form id="register-form">
          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <input type="email" id="email" name="email" required placeholder="tu@email.com" />
          </div>
          <div class="form-group">
            <label for="password">Contraseña (Mín. 8 caracteres)</label>
            <input type="password" id="password" name="password" minlength="8" required placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirmar Contraseña</label>
            <input type="password" id="confirm-password" name="confirmPassword" minlength="8" required placeholder="••••••••" />
          </div>
          <div id="register-error" class="error-msg"></div>
          <div id="register-success" class="success-msg"></div>
          <button type="submit" class="btn-primary" id="btn-register">Registrarse</button>
        </form>
        <p class="register-prompt">
          ¿Ya tienes cuenta? <a href="/login" data-link>Inicia sesión aquí</a>
        </p>
      </div>
    </section>
  `;

  const form = container.querySelector('#register-form');
  const errorDiv = container.querySelector('#register-error');
  const successDiv = container.querySelector('#register-success');
  const btnSubmit = container.querySelector('#btn-register');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorDiv.textContent = '';
    successDiv.textContent = '';

    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    // Validación de coincidencia de contraseñas
    if (password !== confirmPassword) {
      errorDiv.textContent = 'Las contraseñas no coinciden.';
      return;
    }

    const originalBtnText = btnSubmit.textContent;
    btnSubmit.textContent = 'Registrando...';
    btnSubmit.disabled = true;

    try {
      // 1. Crear usuario en la base de datos
      await ApiService.post('/auth/register', { email, password });

      // 2. Auto-login: autenticarse de inmediato para obtener el token JWT
      successDiv.textContent = '¡Cuenta creada! Iniciando sesión...';
      const authResponse = await ApiService.post('/auth/login', { email, password });

      // 3. Persistir sesión
      localStorage.setItem('access_token', authResponse.access_token);
      localStorage.setItem('user_data', JSON.stringify({ email }));

      // 4. Actualizar estado reactivo
      store.setState({
        isAuthenticated: true,
        token: authResponse.access_token,
        user: { email }
      });

      // 5. Redireccionar tras 1 segundo
      setTimeout(() => {
        Router.navigateTo('/catalogo');
      }, 1000);

    } catch (error) {
      errorDiv.textContent = error.message || 'Error al registrar la cuenta.';
    } finally {
      btnSubmit.textContent = originalBtnText;
      btnSubmit.disabled = false;
    }
  });
}