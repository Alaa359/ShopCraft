import { Link } from 'react-router-dom';
import { useCartStore, selectCartCount } from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';

// Barre de navigation principale
export default function Navbar() {
  const count = useCartStore(selectCartCount);
  const user = useAuthStore((state) => state.user);

  return (
    <header className="navbar">
      <nav className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          ShopCraft
        </Link>
        <div className="navbar__links">
          <Link to="/">Accueil</Link>
          <Link to="/cart" className="navbar__cart">
            Panier
            {count > 0 && <span className="navbar__badge">{count}</span>}
          </Link>
          {user ? (
            <>
              {user.role === 'ADMIN' && <Link to="/admin">Dashboard</Link>}
              <Link to="/account">Mon compte</Link>
            </>
          ) : (
            <Link to="/login">Connexion</Link>
          )}
        </div>
      </nav>
    </header>
  );
}