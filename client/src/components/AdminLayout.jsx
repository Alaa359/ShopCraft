import { createContext, useContext, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

// Recherche partagée entre le header admin et les listes des pages
const AdminSearchContext = createContext({ search: '', setSearch: () => {} });
export const useAdminSearch = () => useContext(AdminSearchContext);

// Icônes SVG outline (héritent de la couleur courante)
const ICONS = {
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 7.5L12 3.5l8.5 4-8.5 4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 7.5v9L12 20.5l8.5-4v-9M12 11.5v9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  cart: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M7 6V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V6M6 6l1 13a1.8 1.8 0 0 0 1.8 1.6h6.4A1.8 1.8 0 0 0 17 19l1-13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9.5" cy="20" r="0.5" fill="currentColor" />
      <circle cx="15.5" cy="20" r="0.5" fill="currentColor" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

// Layout admin : sidebar icônes + bandeau (recherche / notifications / avatar),
// le tout posé sur fond beige, contenu en cadres blancs.
export default function AdminLayout({ children }) {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const initial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <AdminSearchContext.Provider value={{ search, setSearch }}>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <Link to="/" className="admin-sidebar__brand" title="Retour à la boutique">
            <span className="admin-sidebar__logo">SC</span>
          </Link>

          <nav className="admin-sidebar__nav" aria-label="Navigation admin">
            <NavLink to="/admin" end className="admin-sidebar__link" title="Statistiques">
              {ICONS.grid}
              <span className="admin-sidebar__label">Statistiques</span>
            </NavLink>
            <NavLink to="/admin/products" className="admin-sidebar__link" title="Produits">
              {ICONS.box}
              <span className="admin-sidebar__label">Produits</span>
            </NavLink>
            <NavLink to="/admin/orders" className="admin-sidebar__link" title="Commandes">
              {ICONS.cart}
              <span className="admin-sidebar__label">Commandes</span>
            </NavLink>
          </nav>

          <Link to="/" className="admin-sidebar__back" title="Retour à la boutique">
            {ICONS.arrow}
          </Link>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar__search">
              {ICONS.search}
              <input
                type="search"
                placeholder="Rechercher un produit, une commande..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Rechercher dans l'administration"
              />
            </div>

            <div className="admin-topbar__right">
              <button type="button" className="admin-topbar__bell" aria-label="Notifications">
                {ICONS.bell}
              </button>
              <span className="admin-topbar__avatar" title={user?.email ?? 'Admin'}>
                {initial}
              </span>
            </div>
          </header>

          {children}
        </main>
      </div>
    </AdminSearchContext.Provider>
  );
}