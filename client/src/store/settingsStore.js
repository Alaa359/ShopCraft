import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Préférences de l'utilisateur (page Paramètres), persistées en localStorage :
// - lang      : langue de l'interface (fr / en / ar)
// - emailNotifs : notifications par email (préférence côté client)
// - sound     : sons de l'interface
// - currency  : devise d'affichage (EUR | DT) — voir lib/currency.js
export const useSettingsStore = create(
  persist(
    (set) => ({
      lang: 'fr',
      emailNotifs: true,
      sound: true,
      currency: 'EUR',

      setLang: (lang) => set({ lang }),
      setCurrency: (currency) => set({ currency }),

      toggle: (key) =>
        set((state) => ({ [key]: !state[key] })),
    }),
    { name: 'shopcraft-settings' }
  )
);