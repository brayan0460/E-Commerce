// src/state/store.js
class Store {
  constructor() {
    // Cargar carrito previo guardado en el navegador o iniciar vacío
    const savedCart = JSON.parse(localStorage.getItem('cart_items')) || [];

    this.state = {
      isAuthenticated: !!localStorage.getItem('access_token'),
      token: localStorage.getItem('access_token') || null,
      user: JSON.parse(localStorage.getItem('user_data')) || null,
      cart: savedCart
    };

    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    
    // Guardar copia local si cambia el carrito
    if (newState.cart) {
      localStorage.setItem('cart_items', JSON.stringify(newState.cart));
    }

    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // LÓGICA DEL CARRITO
  addToCart(product) {
    const currentCart = [...this.state.cart];
    const existingIndex = currentCart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      // Si ya existe en el carrito, incrementar cantidad
      currentCart[existingIndex].quantity += 1;
    } else {
      // Si es nuevo, añadirlo con cantidad 1
      currentCart.push({ ...product, quantity: 1 });
    }

    this.setState({ cart: currentCart });
  }

  removeFromCart(productId) {
    const updatedCart = this.state.cart.filter(item => item.id !== productId);
    this.setState({ cart: updatedCart });
  }

  clearCart() {
    this.setState({ cart: [] });
  }
}

export const store = new Store();