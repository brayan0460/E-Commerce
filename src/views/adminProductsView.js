// src/views/adminProductsView.js
// Panel de administración: alta/edición/baja de productos con subida de imagen
// mediante arrastrar-y-soltar (o clic para elegir archivo) y vista previa.
import { ApiService } from '../services/api.service.js';
import { sanitizeHTML } from '../utils/sanitizer.js';
import { resolveImageUrl, PLACEHOLDER_IMAGE } from '../config/constants.js';
import { showToast } from '../components/toast.js';

export async function renderAdminProductsView(container) {
  container.innerHTML = `
    <section class="admin-section">
      <h2>Panel de Administración</h2>

      <form id="product-form" class="admin-form" enctype="multipart/form-data">
        <h3 id="form-title">Nuevo producto</h3>

        <div class="admin-form-grid">
          <div class="admin-form-fields">
            <div class="form-group">
              <label for="p-name">Nombre</label>
              <input type="text" id="p-name" name="name" required maxlength="150" />
            </div>
            <div class="form-group">
              <label for="p-description">Descripción</label>
              <textarea id="p-description" name="description" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="p-price">Precio (CLP)</label>
                <input type="number" id="p-price" name="price" min="1" step="1" required />
              </div>
              <div class="form-group">
                <label for="p-stock">Stock</label>
                <input type="number" id="p-stock" name="stock" min="0" step="1" required />
              </div>
            </div>
            <div class="form-group">
              <label for="p-category">Categoría</label>
              <input type="text" id="p-category" name="category" required maxlength="50" placeholder="Ej: Poleras" />
            </div>
            <div class="form-group form-group-checkbox" id="availability-group" hidden>
              <label>
                <input type="checkbox" id="p-available" checked />
                Publicado (visible en la tienda)
              </label>
            </div>
          </div>

          <div class="admin-form-image">
            <label>Imagen del producto</label>
            <div id="dropzone" class="image-dropzone">
              <img id="image-preview" src="${PLACEHOLDER_IMAGE}" alt="Vista previa" />
              <p class="dropzone-hint">Arrastra una imagen aquí o haz clic para elegirla</p>
              <input type="file" id="p-image" name="image" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
            </div>
          </div>
        </div>

        <div id="form-error" class="error-msg"></div>

        <div class="admin-form-actions">
          <button type="button" id="btn-cancel-edit" class="btn-secondary" hidden>Cancelar edición</button>
          <button type="submit" id="btn-submit-product" class="btn-primary">Guardar producto</button>
        </div>
      </form>

      <h3 class="admin-list-title">Productos existentes</h3>
      <div id="admin-products-list">
        <p>Cargando productos...</p>
      </div>
    </section>
  `;

  const form = container.querySelector('#product-form');
  const formTitle = container.querySelector('#form-title');
  const nameInput = container.querySelector('#p-name');
  const descriptionInput = container.querySelector('#p-description');
  const priceInput = container.querySelector('#p-price');
  const stockInput = container.querySelector('#p-stock');
  const categoryInput = container.querySelector('#p-category');
  const availabilityGroup = container.querySelector('#availability-group');
  const availableCheckbox = container.querySelector('#p-available');
  const imageInput = container.querySelector('#p-image');
  const imagePreview = container.querySelector('#image-preview');
  const dropzone = container.querySelector('#dropzone');
  const errorDiv = container.querySelector('#form-error');
  const submitBtn = container.querySelector('#btn-submit-product');
  const cancelEditBtn = container.querySelector('#btn-cancel-edit');
  const listContainer = container.querySelector('#admin-products-list');

  let editingId = null;
  let products = [];

  function resetForm() {
    form.reset();
    editingId = null;
    imagePreview.src = PLACEHOLDER_IMAGE;
    formTitle.textContent = 'Nuevo producto';
    submitBtn.textContent = 'Guardar producto';
    availabilityGroup.hidden = true;
    cancelEditBtn.hidden = true;
    errorDiv.textContent = '';
  }

  function fillFormForEdit(product) {
    editingId = product.id;
    nameInput.value = product.name;
    descriptionInput.value = product.description || '';
    priceInput.value = product.price;
    stockInput.value = product.stock;
    categoryInput.value = product.category;
    availableCheckbox.checked = product.is_available;
    availabilityGroup.hidden = false;
    imageInput.value = '';
    imagePreview.src = resolveImageUrl(product.image_url);
    formTitle.textContent = `Editando: ${product.name}`;
    submitBtn.textContent = 'Actualizar producto';
    cancelEditBtn.hidden = false;
    errorDiv.textContent = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setPreviewFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { imagePreview.src = e.target.result; };
    reader.readAsDataURL(file);
  }

  // --- Selección de imagen: clic o arrastrar-y-soltar ---
  dropzone.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => setPreviewFromFile(imageInput.files[0]));

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dropzone-active');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Solo se admiten archivos de imagen', 'error');
      return;
    }
    imageInput.files = e.dataTransfer.files;
    setPreviewFromFile(file);
  });

  function renderList() {
    if (products.length === 0) {
      listContainer.innerHTML = '<p class="empty-state">Aún no hay productos cargados.</p>';
      return;
    }

    listContainer.innerHTML = `
      <div class="admin-products-grid">
        ${products.map((product) => `
          <article class="admin-product-row ${product.is_available ? '' : 'admin-product-row-hidden'}">
            <img src="${resolveImageUrl(product.image_url)}" alt="${sanitizeHTML(product.name)}" />
            <div class="admin-product-info">
              <strong>${sanitizeHTML(product.name)}</strong>
              <span class="category-badge">${sanitizeHTML(product.category)}</span>
              <span>$${product.price.toLocaleString('es-CL')} · Stock: ${product.stock}</span>
              ${!product.is_available ? '<span class="unavailable-badge">Oculto</span>' : ''}
            </div>
            <div class="admin-product-actions">
              <button class="btn-secondary btn-edit" data-id="${product.id}">Editar</button>
              <button class="btn-remove btn-delete" data-id="${product.id}">Eliminar</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    listContainer.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = products.find((p) => p.id === parseInt(btn.dataset.id, 10));
        if (product) fillFormForEdit(product);
      });
    });

    listContainer.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const product = products.find((p) => p.id === parseInt(btn.dataset.id, 10));
        if (!product) return;
        if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;

        try {
          await ApiService.delete(`/products/${product.id}`);
          showToast('Producto eliminado', 'success');
          if (editingId === product.id) resetForm();
          await loadProducts();
        } catch (error) {
          showToast(error.message || 'No se pudo eliminar el producto', 'error');
        }
      });
    });
  }

  async function loadProducts() {
    try {
      products = await ApiService.get('/products/admin/all');
      renderList();
    } catch (error) {
      listContainer.innerHTML = `<p class="error-msg">No se pudo cargar el listado: ${sanitizeHTML(error.message)}</p>`;
    }
  }

  cancelEditBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Guardando...';

    const formData = new FormData();
    formData.append('name', nameInput.value.trim());
    formData.append('description', descriptionInput.value.trim());
    formData.append('price', priceInput.value);
    formData.append('stock', stockInput.value);
    formData.append('category', categoryInput.value.trim());
    if (imageInput.files[0]) formData.append('image', imageInput.files[0]);
    if (editingId) formData.append('is_available', availableCheckbox.checked ? 'true' : 'false');

    try {
      if (editingId) {
        await ApiService.put(`/products/${editingId}`, formData);
        showToast('Producto actualizado', 'success');
      } else {
        await ApiService.post('/products/', formData);
        showToast('Producto creado', 'success');
      }
      resetForm();
      await loadProducts();
    } catch (error) {
      errorDiv.textContent = error.message || 'No se pudo guardar el producto.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  await loadProducts();
}
