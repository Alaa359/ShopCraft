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
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  envelope: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 9.4a2.6 2.6 0 0 1 5.1.7c0 1.7-2.6 2.2-2.6 3.7M12 17.2h.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

// Layout admin : barre de navigation unique en haut (pills + recherche +
// icônes + avatar). Pas de sidebar gauche.
export default function AdminLayout({ children }) {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const initial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  const NAV_ITEMS = [
    { to: '/admin', end: true, icon: ICONS.grid, label: 'Statistiques' },
    { to: '/admin/orders', icon: ICONS.cart, label: 'Commandes' },
    { to: '/admin/products', icon: ICONS.box, label: 'Produits' },
  ];

  return (
    <AdminSearchContext.Provider value={{ search, setSearch }}>
      <div className="admin-layout">
        <header className="admin-topbar">
          <Link to="/" className="admin-topbar__brand" title="Retour à la boutique">
            <span className="admin-topbar__logo">SC</span>
          </Link>

          <nav className="admin-topbar__pills" aria-label="Pages admin">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="admin-topbar__pill">
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-topbar__right">
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

            <a
              className="admin-topbar__link"
              href="mailto:alaameur33@gmail.com?subject=Support ShopCraft"
              title="Besoin d'aide ?"
            >
              {ICONS.help}
              <span>Aide</span>
            </a>

            <Link to="/account" className="admin-topbar__link" title="Paramètres">
              {ICONS.settings}
              <span>Paramètres</span>
            </Link>

            <button
              type="button"
              className="admin-topbar__icon"
              aria-label="Messages"
              title="Messages"
            >
              {ICONS.envelope}
            </button>

            <span className="admin-topbar__avatar" title={user?.email ?? 'Admin'}>
              {initial}
            </span>
          </div>
        </header>

        <main className="admin-main">{children}</main>
      </div>
    </AdminSearchContext.Provider>
  );
}