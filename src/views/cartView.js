// src/views/cartView.js
import { store } from '../state/store.js';

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
              <img src="${item.image_url || './assets/images/placeholder.png'}" alt="${item.name}">
              <div class="item-details">
                <h4>${item.name}</h4>
                <p>Precio: $${item.price.toLocaleString('es-CL')}</p>
                <p>Cantidad: ${item.quantity}</p>
                <p>Subtotal: $${(item.price * item.quantity).toLocaleString('es-CL')}</p>
              </div>
              <button class="btn-remove" data-id="${item.id}">Eliminar</button>
            </div>
          `).join('')}
        </div>

        <div class="cart-summary">
          <h3>Total: $${total.toLocaleString('es-CL')}</h3>
          <button id="btn-clear" class="btn-secondary">Vaciar Carrito</button>
          <button id="btn-checkout" class="btn-primary">Procesar Compra</button>
        </div>
      </section>
    `;

    // Escuchadores de eventos dentro del carrito
    container.querySelector('.cart-list').addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove')) {
        const id = parseInt(e.target.getAttribute('data-id'), 10);
        store.removeFromCart(id);
      }
    });

    container.querySelector('#btn-clear').addEventListener('click', () => {
      store.clearCart();
    });
  };

  render(store.getState());
  store.subscribe(render);
}