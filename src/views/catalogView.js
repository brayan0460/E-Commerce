// src/views/catalogView.js
// ==============================================================================
// ARQUITECTURA FRONTEND: VISTA DE CATÁLOGO
// 1. Separación de responsabilidades: Esta vista solo se encarga de inyectar 
//    el HTML y solicitar los datos al servicio centralizado.
// 2. Manejo asíncrono seguro: El uso de try/catch previene que la UI colapse 
//    si el backend de FastAPI está caído o la red falla.
// 3. Inyección dinámica: Se utiliza map() para iterar sobre la respuesta de 
//    la base de datos y construir los componentes HTML de forma eficiente.
// ==============================================================================
// src/views/catalogView.js
import { ApiService } from '../services/api.service.js';
import { store } from '../state/store.js';

export async function renderCatalogView(container) {
  container.innerHTML = `
    <section class="catalog-section">
      <h2>Catálogo de Ropa</h2>
      <div id="product-grid" class="grid-container">
        <p>Cargando inventario...</p>
      </div>
    </section>
  `;

  const grid = container.querySelector('#product-grid');

  try {
    const products = await ApiService.get('/products/');

    if (products.length === 0) {
      grid.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
      return;
    }

    // Renderizar productos
    grid.innerHTML = products.map(product => `
      <article class="product-card">
        <div class="product-image">
          <img src="${product.image_url || './assets/images/placeholder.png'}" alt="${product.name}">
        </div>
        <div class="product-info">
          <span class="category-badge">${product.category}</span>
          <h3>${product.name}</h3>
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
    `).join('');

    // Escuchador de eventos delegado para añadir al carrito
    grid.addEventListener('click', (e) => {
      const button = e.target.closest('.btn-add-cart');
      if (button && !button.disabled) {
        const productId = parseInt(button.getAttribute('data-id'), 10);
        const selectedProduct = products.find(p => p.id === productId);

        if (selectedProduct) {
          store.addToCart(selectedProduct);
          
          // Feedback visual temporal en el botón
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
    grid.innerHTML = `<p class="error-msg">Error al cargar el catálogo: ${error.message}</p>`;
  }
}