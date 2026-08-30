import { Link, NavLink } from 'react-router-dom';

// Layout interne de l'espace admin : sidebar sombre fixe + contenu principal
export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">ShopCraft</div>
        <nav className="admin-sidebar__nav" aria-label="Navigation admin">
          <NavLink to="/admin" end className="admin-sidebar__link">
            Statistiques
          </NavLink>
          <NavLink to="/admin/products" className="admin-sidebar__link">
            Produits
          </NavLink>
          <NavLink to="/admin/orders" className="admin-sidebar__link">
            Commandes
          </NavLink>
        </nav>
        <Link to="/" className="admin-sidebar__back">
          ← Retour à la boutique
        </Link>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}