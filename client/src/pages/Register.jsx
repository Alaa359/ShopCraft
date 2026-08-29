import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

// Page d'inscription
export default function Register() {
  const register = useAuthStore((state) => state.register);
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

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">Créer un compte</h1>

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
            Mot de passe (6 caractères min)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth__input"
              placeholder="••••••••"
            />
          </label>

          <label className="auth__label">
            Confirmer le mot de passe
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="auth__input"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth__switch">
          Déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
}