// src/views/profileView.js
import { ApiService } from '../services/api.service.js';
import { store } from '../state/store.js';
import { sanitizeHTML } from '../utils/sanitizer.js';

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function renderOrderCard(order) {
  return `
    <article class="order-card">
      <header class="order-card-header">
        <div>
          <strong>Pedido #${order.id}</strong>
          <span class="order-date">${formatDate(order.created_at)}</span>
        </div>
        <span class="order-status status-${sanitizeHTML(order.status)}">${sanitizeHTML(order.status)}</span>
      </header>
      <ul class="order-items-list">
        ${order.items.map(item => `
          <li>
            <span>${item.quantity} × ${sanitizeHTML(item.product_name)}</span>
            <span>$${(item.unit_price * item.quantity).toLocaleString('es-CL')}</span>
          </li>
        `).join('')}
      </ul>
      <footer class="order-card-footer">
        <span>Total</span>
        <strong>$${order.total.toLocaleString('es-CL')}</strong>
      </footer>
    </article>
  `;
}

export async function renderProfileView(container) {
  const { user } = store.getState();

  container.innerHTML = `
    <section class="profile-section">
      <h2>Mi Perfil</h2>
      <div class="profile-card">
        <p><strong>Correo:</strong> ${sanitizeHTML(user?.email || '')}</p>
        <p><strong>Rol:</strong> ${user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
      </div>

      <h3 class="orders-title">Historial de Pedidos</h3>
      <div id="orders-list">
        <p>Cargando pedidos...</p>
      </div>
    </section>
  `;

  const ordersList = container.querySelector('#orders-list');

  try {
    const orders = await ApiService.get('/orders/me');

    if (orders.length === 0) {
      ordersList.innerHTML = '<p class="empty-state">Todavía no tienes pedidos. ¡Explora el catálogo!</p>';
      return;
    }

    ordersList.innerHTML = `<div class="orders-grid">${orders.map(renderOrderCard).join('')}</div>`;
  } catch (error) {
    ordersList.innerHTML = `<p class="error-msg">No se pudo cargar el historial: ${sanitizeHTML(error.message)}</p>`;
  }
}
