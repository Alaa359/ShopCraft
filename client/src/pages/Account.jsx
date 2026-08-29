import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getMyOrders } from '../api/client.js';

// Libellés français des statuts de commande
const STATUS_LABELS = {
  PENDING: 'En attente',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

// Page compte : profil + historique des commandes
export default function Account() {
  const { user, logout, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!user);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMe()
      .then(() => {
        const currentToken = useAuthStore.getState().token;
        return getMyOrders(currentToken);
      })
      .then(setOrders)
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

        {error && <p className="auth__error">{error}</p>}

        {orders && orders.length === 0 && (
          <p className="home__message">Vous n'avez pas encore de commande.</p>
        )}

        {orders && orders.length > 0 && (
          <div className="orders">
            {orders.map((order) => (
              <div className="order" key={order.id}>
                <div className="order__head">
                  <span className="order__id">Commande #{order.id.slice(-8).toUpperCase()}</span>
                  <span className={`order__status order__status--${order.status.toLowerCase()}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="order__date">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <ul className="order__items">
                  {order.items.map((item) => (
                    <li className="order__item" key={item.id}>
                      <Link to={`/products/${item.product.id}`} className="order__item-name">
                        {item.product.name}
                      </Link>
                      <span>
                        × {item.quantity} — {Number(item.price).toFixed(2)} €
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="order__total">
                  Total : <strong>{Number(order.total).toFixed(2)} €</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button className="btn btn--ghost" onClick={handleLogout}>
        Se déconnecter
      </button>
    </div>
  );
}