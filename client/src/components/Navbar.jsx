import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCartStore, selectCartCount } from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useSupportStore } from '../store/notificationStore.js';
import NotificationsBell from './NotificationsBell.jsx';
import UserMenu from './UserMenu.jsx';
import { suggestProducts } from '../api/client.js';
import { useT } from '../i18n.js';

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

// Barre de navigation : logo, recherche centrée, compte + panier, menu mobile
export default function Navbar() {
  const count = useCartStore(selectCartCount);
  const user = useAuthStore((state) => state.user);
  const openHelp = useSupportStore((state) => state.openHelp);
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // --- Autocomplétion de la recherche ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef(null);
  const sugBoxRef = useRef(null);

  // Ferme le dropdown quand on clique ailleurs
  useEffect(() => {
    function onDocClick(e) {
      if (sugBoxRef.current && !sugBoxRef.current.contains(e.target)) {
        setShowSug(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Fetch des suggestions avec debounce quand l'utilisateur tape
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const term = query.trim();
    if (term.length < 1) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await suggestProducts(term);
        setSuggestions(res || []);
        setShowSug(true);
      } catch {
        setSuggestions([]);
        setShowSug(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function goToProduct(id) {
    setQuery('');
    setSuggestions([]);
    setShowSug(false);
    closeMenu();
    navigate(`/products/${id}`);
  }

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

        <form className="navbar__search" role="search" onSubmit={handleSearch} ref={sugBoxRef}>
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
            onFocus={() => suggestions.length && setShowSug(true)}
            placeholder={t('search')}
            aria-label={t('search')}
          />
          {showSug && suggestions.length > 0 && (
            <div className="navbar__suggest">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="navbar__suggest-item"
                  onClick={() => goToProduct(p.id)}
                >
                  <span className="navbar__suggest-thumb">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" loading="lazy" />
                    ) : (
                      <span className="navbar__suggest-ph">SC</span>
                    )}
                  </span>
                  <span className="navbar__suggest-name">{p.name}</span>
                  <span className="navbar__suggest-cat">{p.category}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <nav className={`navbar__menu ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation">
          <form className="navbar__search navbar__search--mobile" role="search" onSubmit={handleSearch}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              aria-label={t('search')}
              autoFocus={menuOpen}
            />
            {showSug && suggestions.length > 0 && (
              <div className="navbar__suggest">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="navbar__suggest-item"
                    onClick={() => goToProduct(p.id)}
                  >
                    <span className="navbar__suggest-name">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
          <NavLink to="/" className="navbar__link" onClick={closeMenu}>
            {t('home')}
          </NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className="navbar__link" onClick={closeMenu}>
              {t('dashboard')}
            </NavLink>
          )}
          <button
            type="button"
            className="navbar__link navbar__link--btn"
            onClick={() => {
              closeMenu();
              openHelp();
            }}
          >
            {t('help')}
          </button>
          {!user && (
            <Link to="/login" className="navbar__link" onClick={closeMenu}>
              {t('login')}
            </Link>
          )}
        </nav>

        <div className="navbar__actions">
          <NotificationsBell />
          {user && <UserMenu />}
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