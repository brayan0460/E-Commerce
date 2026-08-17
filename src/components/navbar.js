// src/components/navbar.js
import { store } from '../state/store.js';
import { Router } from '../router.js';

export function renderNavbar(container) {
  const render = (state) => {
    // Calcule el total de prendas en el carrito
    const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    const authLinks = state.isAuthenticated
      ? `
        <li><span class="user-name">Hola, ${state.user?.email || 'Usuario'}</span></li>
        <li><button id="btn-logout" class="btn-link">Cerrar Sesión</button></li>
      `
      : `
        <li><a href="/login" data-link>Iniciar Sesión</a></li>
      `;

    container.innerHTML = `
      <nav class="navbar">
        <div class="logo"><a href="/" data-link>TiendaRopa</a></div>
        <ul class="nav-links">
          <li><a href="/catalogo" data-link>Catálogo</a></li>
          <li>
            <a href="/cart" data-link class="cart-link">
              🛒 Carrito <span class="cart-badge">${cartCount}</span>
            </a>
          </li>
          ${authLinks}
        </ul>
      </nav>
    `;

    const logoutBtn = container.querySelector('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        // Borrar tokens físicos
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        
        // Limpiar estado en memoria
        store.setState({ isAuthenticated: false, user: null, token: null });
        
        // Redirigir
        Router.navigateTo('/login');
      });
    }
  };
  
  render(store.getState());
  store.subscribe(render);
}