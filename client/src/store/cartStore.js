import { create } from 'zustand';

// État du panier global (Zustand)
// Chaque entrée : { id, name, price, image, stock, quantity }
export const useCartStore = create((set, get) => ({
  items: [],

  // Ajoute un produit, ou augmente sa quantité s'il est déjà dans le panier.
  // La quantité ne peut pas dépasser le stock disponible.
  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existing = items.find((item) => item.id === product.id);

    if (existing) {
      set({
        items: items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image: product.images?.[0] || null,
            stock: product.stock,
            quantity: Math.min(quantity, product.stock),
          },
        ],
      });
    }
  },

  // Supprime entièrement un produit du panier
  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  // Modifie la quantité d'un produit (bornée entre 1 et le stock)
  updateQuantity: (id, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
          : item
      ),
    }));
  },

  // Vide le panier
  clear: () => set({ items: [] }),
}));

// Sélecteurs (dérivés) : à utiliser avec useCartStore(selectCartCount)
export const selectCartCount = (state) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartTotal = (state) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);