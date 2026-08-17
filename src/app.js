// src/app.js
import { renderNavbar } from './components/navbar.js';
import { Router } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
  // Renderizar la barra de navegación fija
  renderNavbar(document.getElementById('navbar-root'));

  // Inicializar el enrutador
  Router.init();
});