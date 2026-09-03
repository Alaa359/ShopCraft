import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import GoogleButton from '../components/GoogleButton.jsx';

// Page d'inscription
export default function Register() {
  const register = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const token = useAuthStore((state) => state.token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Déjà connecté ? On évite d'afficher la page
  if (token) {
    return <Navigate to="/account" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      await register(email, password);
      navigate('/account', { replace: true });
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
      navigate('/account', { replace: true });
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
          <h1 className="auth__title">Créer un compte</h1>
          <p className="auth__subtitle">
            Rejoignez ShopCraft pour profiter d'un univers de pièces sélectionnées.
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
            <span>Mot de passe (6 caractères min)</span>
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
                minLength={6}
                className="auth__input"
                placeholder="••••••••"
              />
            </div>
          </label>

          <label className="auth__label">
            <span>Confirmer le mot de passe</span>
            <div className="auth__input-wrap">
              <svg className="auth__icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="auth__input"
                placeholder="••••••••"
              />
            </div>
          </label>

          <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="auth__divider">
          <span>ou</span>
        </div>
        <GoogleButton onSuccess={handleGoogle} />

        <p className="auth__switch">
          Déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
}