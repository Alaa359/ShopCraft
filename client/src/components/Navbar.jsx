import { Link } from 'react-router-dom';

// Barre de navigation principale
export default function Navbar() {
  return (
    <header className="navbar">
      <nav className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          ShopCraft
        </Link>
        <div className="navbar__links">
          <Link to="/">Accueil</Link>
        </div>
      </nav>
    </header>
  );
}