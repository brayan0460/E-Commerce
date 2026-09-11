// src/views/catalogView.js
import { ApiService } from '../services/api.service.js';
import { store } from '../state/store.js';
import { sanitizeHTML } from '../utils/sanitizer.js';
import { resolveImageUrl } from '../config/constants.js';
import { showToast } from '../components/toast.js';

const SKELETON_CARD = `
  <div class="product-card skeleton-card">
    <div class="product-image skeleton-block"></div>
    <div class="product-info">
      <div class="skeleton-line skeleton-line-sm"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line-sm"></div>
    </div>
  </div>
`;

function renderProductCard(product) {
  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${resolveImageUrl(product.image_url)}" alt="${sanitizeHTML(product.name)}" loading="lazy">
      </div>
      <div class="product-info">
        <span class="category-badge">${sanitizeHTML(product.category)}</span>
        <h3>${sanitizeHTML(product.name)}</h3>
        <p class="price">$${product.price.toLocaleString('es-CL')}</p>
        <button
          class="btn-add-cart"
          data-id="${product.id}"
          ${product.stock === 0 ? 'disabled' : ''}
        >
          ${product.stock > 0 ? 'Añadir al carrito' : 'Agotado'}
        </button>
      </div>
    </article>
  `;
}

export async function renderCatalogView(container) {
  container.innerHTML = `
    <section class="catalog-section">
      <h2>Catálogo de Ropa</h2>
      <div id="product-grid" class="grid-container">
        ${SKELETON_CARD.repeat(6)}
      </div>
    </section>
  `;

  const grid = container.querySelector('#product-grid');

  try {
    const products = await ApiService.get('/products/');

    if (products.length === 0) {
      grid.innerHTML = '<p class="empty-state">No hay productos disponibles en este momento.</p>';
      return;
    }

    grid.innerHTML = products.map(renderProductCard).join('');

    // Escuchador de eventos delegado para añadir al carrito
    grid.addEventListener('click', (e) => {
      const button = e.target.closest('.btn-add-cart');
      if (button && !button.disabled) {
        const productId = parseInt(button.getAttribute('data-id'), 10);
        const selectedProduct = products.find((p) => p.id === productId);

        if (selectedProduct) {
          store.addToCart(selectedProduct);
          showToast(`"${selectedProduct.name}" añadido al carrito`, 'success');

          const originalText = button.textContent;
          button.textContent = '¡Añadido! ✓';
          button.classList.add('btn-added');
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('btn-added');
          }, 1200);
        }
      }
    });

  } catch (error) {
    grid.innerHTML = `<p class="error-msg">Error al cargar el catálogo: ${sanitizeHTML(error.message)}</p>`;
  }
}
