// src/views/homeView.js
import { sanitizeHTML } from '../utils/sanitizer.js';

export function renderHomeView(container) {
  // 1. Inyectar estructura HTML limpia
  container.innerHTML = sanitizeHTML(`
    <section class="hero">
      <h1>Bienvenido a la Plataforma</h1>
      <button id="btn-action" class="btn-primary">Explorar</button>
      <div id="output"></div>
    </section>
  `);

  // 2. Seleccionar elementos e hilar eventos
  const btn = container.querySelector('#btn-action');
  const output = container.querySelector('#output');

  btn.addEventListener('click', () => {
    output.textContent = '¡Acción ejecutada correctamente!';
  });
}