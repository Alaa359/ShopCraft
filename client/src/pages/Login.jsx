import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

// Page de connexion
export default function Login() {
  const login = useAuthStore((state) => state.login);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Retour vers la page d'origine si protégée, sinon le compte
      const from = location.state?.from?.pathname || '/account';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">Connexion</h1>

        {error && <p className="auth__error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth__form">
          <label className="auth__label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth__input"
              placeholder="vous@exemple.com"
            />
          </label>

          <label className="auth__label">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth__input"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="auth__switch">
          Pas encore de compte ? <Link to="/register">Inscrivez-vous</Link>
        </p>
      </div>
    </div>
  );
}