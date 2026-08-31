import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Thème clair / sombre, persisté dans localStorage.
// Le sélecteur `.theme-dark` est posé sur <html> pour écraser les variables.
export const useThemeStore = create(
  persist(
    (set) => ({
      dark: false,

      toggle: () => set((state) => ({ dark: !state.dark })),

      // Applique / retire la classe sur <html>
      apply: (dark) => {
        document.documentElement.classList.toggle('theme-dark', dark);
      },
    }),
    { name: 'shopcraft-theme' }
  )
);

// Au chargement, réapplique le thème persisté (avant tout rendu)
if (typeof document !== 'undefined') {
  const stored = useThemeStore.getState().dark;
  document.documentElement.classList.toggle('theme-dark', stored);
}