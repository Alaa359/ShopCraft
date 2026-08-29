import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

// Page compte : profil de l'utilisateur connecté
// (l'historique de commandes sera branché à l'étape 5)
export default function Account() {
  const { user, logout, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!user);

  // Rafraîchit le profil au montage (utilisateur déjà connecté après reload)
  useEffect(() => {
    fetchMe()
      .catch(() => useAuthStore.getState().logout())
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return <p className="home__message">Chargement du profil...</p>;
  }

  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR')
    : '—';

  return (
    <div className="account">
      <h1 className="account__title">Mon compte</h1>

      <div className="account__card">
        <div className="account__row">
          <span className="account__label">Email</span>
          <span>{user?.email}</span>
        </div>
        <div className="account__row">
          <span className="account__label">Rôle</span>
          <span>{user?.role === 'ADMIN' ? 'Administrateur' : 'Client'}</span>
        </div>
        <div className="account__row">
          <span className="account__label">Membre depuis</span>
          <span>{createdAt}</span>
        </div>
      </div>

      <section className="account__section">
        <h2 className="account__subtitle">Mes commandes</h2>
        <p className="home__message">Vous n'avez pas encore de commande.</p>
      </section>

      <button className="btn btn--ghost" onClick={handleLogout}>
        Se déconnecter
      </button>
    </div>
  );
}