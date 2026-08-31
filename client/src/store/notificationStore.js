import { create } from 'zustand';
import * as api from '../api/client.js';
import { useAuthStore } from './authStore.js';

// Cloche de notification : liste + compteur de non lues.
// Non persisté (chargé depuis le serveur au démarrage / rafraîchi).
export const useNotificationStore = create((set) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Charge les notifications de l'utilisateur connecté (token depuis le store)
  fetch: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const { items, unreadCount } = await api.getNotifications(token);
      set({ items, unreadCount, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Marque tout comme lu (ou une seule notification si id fourni)
  markRead: async (id = null) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      await api.markNotificationsRead(token, id);
      if (id) {
        set((state) => ({
          items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      } else {
        set((state) => ({ items: state.items.map((n) => ({ ...n, read: true })), unreadCount: 0 }));
      }
    } catch {
      // silencieux : le prochain fetch re-synchronisera
    }
  },

  // Réinitialise l'état (ex. à la déconnexion)
  reset: () => set({ items: [], unreadCount: 0, error: null }),
}));

// Modales du support (aide) ouvertes globalement.
// help : formulaire pour envoyer un problème ; inbox : boîte admin ;
// thread : fil de discussion d'un ticket (id du ticket).
export const useSupportStore = create((set) => ({
  helpOpen: false,
  inboxOpen: false,
  threadTicketId: null,

  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),

  openInbox: () => set({ inboxOpen: true }),
  closeInbox: () => set({ inboxOpen: false }),

  openThread: (ticketId) => set({ threadTicketId: ticketId }),
  closeThread: () => set({ threadTicketId: null }),
}));