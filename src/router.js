// src/router.js
import { renderCatalogView } from './views/catalogView.js';
import { renderLoginView } from './views/loginView.js';
import { renderCartView } from './views/cartView.js';
import { renderRegisterView } from './views/registerView.js';
import { renderProfileView } from './views/profileView.js';
import { renderAdminProductsView } from './views/adminProductsView.js';
import { store } from './state/store.js';

// Envuelve una vista exigiendo sesión iniciada; si no hay sesión, redirige a /login.
function requireAuth(viewFn) {
  return (container) => {
    if (!store.getState().isAuthenticated) {
      Router.navigateTo('/login');
      return;
    }
    return viewFn(container);
  };
}

// Envuelve una vista exigiendo rol admin; si no corresponde, redirige.
function requireAdmin(viewFn) {
  return (container) => {
    const { isAuthenticated, user } = store.getState();
    if (!isAuthenticated) {
      Router.navigateTo('/login');
      return;
    }
    if (user?.role !== 'admin') {
      Router.navigateTo('/');
      return;
    }
    return viewFn(container);
  };
}

const routes = {
  '/': renderCatalogView,         // La página principal muestra el catálogo de ropa
  '/catalogo': renderCatalogView, // Ruta alternativa para el catálogo
  '/login': renderLoginView,      // Ruta para el inicio de sesión
  '/register': renderRegisterView, // Ruta para el registro de usuarios
  '/cart': renderCartView,        // Ruta para el carrito de compras
  '/perfil': requireAuth(renderProfileView),      // Datos del usuario + historial de pedidos
  '/admin': requireAdmin(renderAdminProductsView), // Panel de administración de productos
};

export class Router {
  static init() {
    // Escuchar el botón "Atrás/Adelante" del navegador
    window.addEventListener('popstate', () => {
      Router.handleRoute(window.location.pathname);
    });

    // Interceptar clics en enlaces <a> para evitar recargar la página
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');

        // BLOQUEO ESTRATÉGICO: Solo navegar si la ruta destino es diferente a la actual
        if (window.location.pathname !== href) {
          Router.navigateTo(href);
        }
      }
    });

    // Cargar la ruta inicial
    Router.handleRoute(window.location.pathname);
  }

  static navigateTo(url) {
    window.history.pushState(null, null, url);
    Router.handleRoute(window.location.pathname);
  }

  static async handleRoute(pathname) {
    const container = document.getElementById('app');
    if (!container) return;

    let cleanPath = pathname.replace('/index.html', '');
    if (cleanPath === '') cleanPath = '/';

    const view = routes[cleanPath] || routes['/'];

    container.innerHTML = '';
    await view(container);
  }
}
