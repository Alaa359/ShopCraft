import { create } from 'zustand';

// Frais de livraison : offerts dès un certain montant, sinon tarif fixe.
// Ces constantes doivent rester alignées sur celles de server/lib/cart.js.
export const SHIPPING_FEE = 4.9;
export const FREE_SHIPPING_THRESHOLD = 100;

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

// Total des produits uniquement (hors livraison)
export const selectCartSubtotal = (state) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);

// Frais de livraison calculés de la même façon que côté serveur
export const selectCartShipping = (state) => {
  const subtotal = selectCartSubtotal(state);
  return subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
};

// Total général (produits + livraison) — aligné sur le total validé par l'API
export const selectCartTotal = (state) => selectCartSubtotal(state) + selectCartShipping(state);