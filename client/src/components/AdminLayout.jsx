import { createContext, useContext, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

// Dimensions fixes des icônes du dock (hauteur + écart) pour calculer la
// distance souris / icône
const DOCK_H = 50;
const DOCK_GAP = 12;

// Élément du dock vertical inspiré d'Apple : l'icône grossit quand le
// curseur s'en approche, avec un retour élastique (spring).
function DockItem({ mouseY, top, children }) {
  const distance = useTransform(mouseY, (y) => {
    const d = Math.abs(y - (top + DOCK_H / 2));
    const RANGE = 70;
    if (d > RANGE) return 1;
    const lift = top === 0 ? 0.45 : 0.35; // le premier élément grossit un peu plus
    return 1 + (1 - d / RANGE) * lift;
  });
  const scale = useSpring(distance, { stiffness: 340, damping: 20, mass: 0.5 });
  return <motion.div className="admin-dock__item" style={{ scale }}>{children}</motion.div>;
}

// Layout admin : sidebar icônes (dock vertical pastel) + bandeau
// (pills de navigation / recherche / notifications / avatar).
export default function AdminLayout({ children }) {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const initial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  const NAV_ITEMS = [
    { to: '/admin', end: true, icon: ICONS.grid, label: 'Statistiques' },
    { to: '/admin/orders', icon: ICONS.cart, label: 'Commandes' },
    { to: '/admin/products', icon: ICONS.box, label: 'Produits' },
  ];

  const mouseY = useMotionValue(-Infinity);

  return (
    <AdminSearchContext.Provider value={{ search, setSearch }}>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <Link to="/" className="admin-sidebar__brand" title="Retour à la boutique">
            <span className="admin-sidebar__logo">SC</span>
          </Link>

          <nav
            className="admin-sidebar__nav"
            aria-label="Navigation admin"
            onMouseMove={(e) => mouseY.set(e.clientY - e.currentTarget.getBoundingClientRect().top)}
            onMouseLeave={() => mouseY.set(-Infinity)}
          >
            {NAV_ITEMS.map((item, index) => (
              <DockItem key={item.to} mouseY={mouseY} top={index * (DOCK_H + DOCK_GAP)}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className="admin-sidebar__link"
                  title={item.label}
                >
                  {item.icon}
                  <span className="admin-sidebar__label">{item.label}</span>
                </NavLink>
              </DockItem>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <a
              className="admin-sidebar__link"
              href="mailto:alaameur33@gmail.com?subject=Support ShopCraft"
              title="Besoin d'aide ?"
            >
              {ICONS.help}
              <span className="admin-sidebar__label">Aide</span>
            </a>
            <Link to="/account" className="admin-sidebar__link" title="Paramètres">
              {ICONS.settings}
              <span className="admin-sidebar__label">Paramètres</span>
            </Link>
          </div>

          <Link to="/" className="admin-sidebar__back" title="Retour à la boutique">
            {ICONS.arrow}
          </Link>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <nav className="admin-topbar__pills" aria-label="Pages admin">
              <NavLink to="/admin" end className="admin-topbar__pill">
                Dashboard
              </NavLink>
              <NavLink to="/admin/orders" className="admin-topbar__pill">
                Orders
              </NavLink>
              <NavLink to="/admin/products" className="admin-topbar__pill">
                Products
              </NavLink>
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

              <button
                type="button"
                className="admin-topbar__icon"
                aria-label="Messages"
                title="Messages"
              >
                {ICONS.envelope}
              </button>

              <button
                type="button"
                className="admin-topbar__icon"
                aria-label="Notifications"
                title="Notifications"
              >
                {ICONS.bell}
                <span className="admin-topbar__dot" aria-hidden="true" />
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