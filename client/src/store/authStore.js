import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../api/client.js';

// État d'authentification global.
// Persisté dans localStorage (reconnecté après rechargement de page).
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      // Connexion : récupère { token, user } et les stocke
      login: async (email, password) => {
        const data = await api.login(email, password);
        set({ token: data.token, user: data.user });
        return data.user;
      },

      // Inscription : récupère { token, user } et les stocke
      register: async (email, password) => {
        const data = await api.register(email, password);
        set({ token: data.token, user: data.user });
        return data.user;
      },

      // Connexion / inscription via Google : récupère { token, user }
      loginWithGoogle: async (idToken) => {
        const data = await api.googleLogin(idToken);
        set({ token: data.token, user: data.user });
        return data.user;
      },

      // Rafraîchit le profil depuis le serveur (ex. après édition du rôle)
      fetchMe: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return null;
        const user = await api.getMe(token);
        set({ user });
        return user;
      },

      // Déconnexion : supprime le token et l'utilisateur
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'shopcraft-auth' } // clé localStorage
  )
);