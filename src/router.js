// src/router.js
import { renderCatalogView } from './views/catalogView.js';
import { renderLoginView } from './views/loginView.js';
import { renderCartView } from './views/cartView.js'; // Importar vista
// 1. Mapa de rutas asociadas a sus vistas
const routes = {
  '/': renderCatalogView,         // La página principal muestra el catálogo de ropa
  '/catalogo': renderCatalogView, // Ruta alternativa para el catálogo
  '/login': renderLoginView,
  '/cart': renderCartView,        // Ruta para el carrito de compras
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
    const view = routes[pathname] || routes['/']; // Fallback a inicio si la ruta no existe

    container.innerHTML = ''; // Limpiar la vista anterior
    await view(container);    // Ejecutar y renderizar la nueva vista (asíncrona)
  }
}