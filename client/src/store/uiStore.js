import { create } from 'zustand';

// Notifications légères globales (toast)
// Utilisées notamment lors de l'ajout d'un produit au panier.
let nextId = 0;

export const useUiStore = create((set) => ({
  toasts: [],

  // Affiche un toast pendant ~3 s puis le retire
  showToast: (message, type = 'success') => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));