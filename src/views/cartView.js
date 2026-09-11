// src/views/cartView.js
import { store } from '../state/store.js';
import { ApiService } from '../services/api.service.js';
import { sanitizeHTML } from '../utils/sanitizer.js';
import { resolveImageUrl } from '../config/constants.js';
import { showToast } from '../components/toast.js';
import { Router } from '../router.js';

export function renderCartView(container) {
  const render = (state) => {
    const { cart } = state;

    if (cart.length === 0) {
      container.innerHTML = `
        <section class="cart-section">
          <h2>Tu Carrito de Compras</h2>
          <p>El carrito está vacío.</p>
          <a href="/catalogo" data-link class="btn-primary">Ir al Catálogo</a>
        </section>
      `;
      return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    container.innerHTML = `
      <section class="cart-section">
        <h2>Tu Carrito de Compras</h2>
        <div class="cart-list">
          ${cart.map(item => `
            <div class="cart-item">
              <img src="${resolveImageUrl(item.image_url)}" alt="${sanitizeHTML(item.name)}">
              <div class="item-details">
                <h4>${sanitizeHTML(item.name)}</h4>
                <p>Precio: $${item.price.toLocaleString('es-CL')}</p>
                <div class="qty-control">
                  <button class="btn-qty btn-qty-minus" data-id="${item.id}" aria-label="Disminuir cantidad">−</button>
                  <span class="qty-value">${item.quantity}</span>
                  <button class="btn-qty btn-qty-plus" data-id="${item.id}" aria-label="Aumentar cantidad" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                </div>
                <p>Subtotal: $${(item.price * item.quantity).toLocaleString('es-CL')}</p>
              </div>
              <button class="btn-remove" data-id="${item.id}">Eliminar</button>
            </div>
          `).join('')}
        </div>

        <div class="cart-summary">
          <h3>Total: $${total.toLocaleString('es-CL')}</h3>
          <div id="checkout-error" class="error-msg"></div>
          <button id="btn-clear" class="btn-secondary">Vaciar Carrito</button>
          <button id="btn-checkout" class="btn-primary">Procesar Compra</button>
        </div>
      </section>
    `;

    // Escuchadores de eventos dentro del carrito
    container.querySelector('.cart-list').addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.btn-remove');
      if (removeBtn) {
        const id = parseInt(removeBtn.getAttribute('data-id'), 10);
        store.removeFromCart(id);
        return;
      }

      const minusBtn = e.target.closest('.btn-qty-minus');
      if (minusBtn) {
        const id = parseInt(minusBtn.getAttribute('data-id'), 10);
        const item = store.getState().cart.find((i) => i.id === id);
        if (item) store.updateQuantity(id, item.quantity - 1);
        return;
      }

      const plusBtn = e.target.closest('.btn-qty-plus');
      if (plusBtn) {
        const id = parseInt(plusBtn.getAttribute('data-id'), 10);
        const item = store.getState().cart.find((i) => i.id === id);
        if (item) store.updateQuantity(id, Math.min(item.quantity + 1, item.stock ?? Infinity));
      }
    });

    container.querySelector('#btn-clear').addEventListener('click', () => {
      store.clearCart();
    });

    const checkoutBtn = container.querySelector('#btn-checkout');
    const errorDiv = container.querySelector('#checkout-error');

    checkoutBtn.addEventListener('click', async () => {
      if (!store.getState().isAuthenticated) {
        showToast('Inicia sesión para finalizar la compra', 'error');
        Router.navigateTo('/login');
        return;
      }

      errorDiv.textContent = '';
      const originalText = checkoutBtn.textContent;
      checkoutBtn.textContent = 'Procesando...';
      checkoutBtn.disabled = true;

      try {
        const items = store.getState().cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity
        }));

        const order = await ApiService.post('/orders/checkout', { items });

        store.clearCart();
        showToast(`¡Compra confirmada! Pedido #${order.id}`, 'success');
        Router.navigateTo('/perfil');
      } catch (error) {
        errorDiv.textContent = error.message || 'No se pudo procesar la compra.';
      } finally {
        checkoutBtn.textContent = originalText;
        checkoutBtn.disabled = false;
      }
    });
  };

  render(store.getState());
  store.subscribe(render);
}
