import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import GoogleButton from '../components/GoogleButton.jsx';

// Page de connexion
export default function Login() {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const token = useAuthStore((state) => state.token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Déjà connecté ? On évite d'afficher la page
  if (token) {
    return <Navigate to="/account" replace />;
  }

  const from = location.state?.from?.pathname || '/account';
  const afterAuth = () => navigate(from, { replace: true });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      afterAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(idToken) {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      afterAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <header className="auth__head">
          <span className="auth__monogram" aria-hidden="true">S</span>
          <span className="auth__eyebrow">ShopCraft</span>
          <h1 className="auth__title">Bon retour parmi nous</h1>
          <p className="auth__subtitle">
            Connectez-vous pour retrouver votre panier et vos commandes.
          </p>
        </header>

        {error && <p className="auth__error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth__form">
          <label className="auth__label">
            <span>Email</span>
            <div className="auth__input-wrap">
              <svg className="auth__icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth__input"
                placeholder="vous@exemple.com"
              />
            </div>
          </label>

          <label className="auth__label">
            <span>Mot de passe</span>
            <div className="auth__input-wrap">
              <svg className="auth__icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth__input"
                placeholder="••••••••"
              />
            </div>
          </label>

          <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="auth__divider">
          <span>ou</span>
        </div>
        <GoogleButton onSuccess={handleGoogle} />

        <p className="auth__switch">
          Pas encore de compte ? <Link to="/register">Inscrivez-vous</Link>
        </p>
      </div>
    </div>
  );
}
