import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCartStore, selectCartCount } from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';

// Icône compte / utilisateur (SVG inline)
function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// Icône panier (SVG inline)
function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L20 8H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Icône notifications (SVG inline)
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 17v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Barre de navigation : logo, recherche centrée, compte + panier, menu mobile
export default function Navbar() {
  const count = useCartStore(selectCartCount);
  const user = useAuthStore((state) => state.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function closeMenu() {
    setMenuOpen(false);
  }

  // La recherche est reflétée dans l'URL (?search=...) lue par la page Home
  function handleSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/?search=${encodeURIComponent(query.trim())}` : '/');
    setQuery('');
    closeMenu();
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" onClick={closeMenu}>
          ShopCraft
        </Link>

        <form className="navbar__search" role="search" onSubmit={handleSearch}>
          <svg className="navbar__search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="11"
              cy="11"
              r="6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            aria-label="Rechercher un produit"
          />
        </form>

        <nav className={`navbar__menu ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation">
          <form className="navbar__search navbar__search--mobile" role="search" onSubmit={handleSearch}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              aria-label="Rechercher un produit"
              autoFocus={menuOpen}
            />
          </form>
          <NavLink to="/" className="navbar__link" onClick={closeMenu}>
            Accueil
          </NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className="navbar__link" onClick={closeMenu}>
              Dashboard
            </NavLink>
          )}
          {user ? (
            <Link to="/account" className="navbar__link" onClick={closeMenu}>
              Mon compte
            </Link>
          ) : (
            <Link to="/login" className="navbar__link" onClick={closeMenu}>
              Connexion
            </Link>
          )}
        </nav>

        <div className="navbar__actions">
          {user && (
            <>
              <button
                type="button"
                className="navbar__action"
                aria-label="Notifications"
                title="Notifications"
              >
                <BellIcon />
                <span className="navbar__dot" aria-hidden="true" />
              </button>
              <Link to="/account" className="navbar__action" aria-label="Mon compte" title="Mon compte">
                <AccountIcon />
              </Link>
            </>
          )}
          <Link
            to="/cart"
            className="navbar__action"
            aria-label={`Panier, ${count} article(s)`}
            title="Panier"
          >
            <CartIcon />
            {count > 0 && (
              <span key={count} className="navbar__badge">
                {count}
              </span>
            )}
          </Link>
          <button
            className={`navbar__burger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}