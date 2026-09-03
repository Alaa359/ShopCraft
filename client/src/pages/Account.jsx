import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getMyOrders } from '../api/client.js';
import { useCurrency } from '../lib/useCurrency.js';
import { getInitials } from '../lib/user.js';

// Libellés français des statuts de commande
const STATUS_LABELS = {
  PENDING: 'En attente',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const PAYMENT_METHOD_LABELS = {
  CARD: 'Carte bancaire',
  CASH: 'Espèces à la livraison',
};

const PAYMENT_STATUS_LABELS = {
  PAID: 'Payé',
  UNPAID: 'À payer à la livraison',
};

// Page compte : profil + historique des commandes
export default function Account() {
  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!user);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const { format } = useCurrency();

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

  if (loading) {
    return <p className="home__message">Chargement du profil...</p>;
  }
  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR')
    : '—';

  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || '';
  const initial = getInitials(user?.displayName, user?.email);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="account">
      {/* En-tête : photo + nom + rôle */}
      <header className="account__hero">
        {user?.avatar ? (
          <img className="account__avatar" src={user.avatar} alt={displayName} />
        ) : (
          <span className="account__avatar account__avatar--initial">{initial}</span>
        )}
        <div className="account__hero-text">
          <span className="account__eyebrow">Mon compte</span>
          <h1 className="account__title">{displayName || 'Mon compte'}</h1>
          <div className="account__badges">
            <span className={`account__role account__role--${isAdmin ? 'admin' : 'client'}`}>
              {isAdmin ? 'Administrateur' : 'Client'}
            </span>
            <span className="account__since">Membre depuis {createdAt}</span>
          </div>
        </div>
      </header>

      <section className="account__info">
        <h2 className="account__info-title">Informations du compte</h2>
        <div className="account__info-list">
          <div className="account__info-row">
            <span className="account__info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
            <div className="account__info-text">
              <span className="account__info-label">Adresse e-mail</span>
              <strong className="account__info-value">{user?.email}</strong>
            </div>
          </div>

          <div className="account__info-row">
            <span className="account__info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M2.8 19.2c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6M16.2 5.2a3.2 3.2 0 0 1 0 5.7M18 14.9c1.4.7 2.6 2 3.2 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="account__info-text">
              <span className="account__info-label">Rôle</span>
              <strong className="account__info-value">
                {isAdmin ? 'Administrateur' : 'Client'}
              </strong>
            </div>
          </div>

          <div className="account__info-row">
            <span className="account__info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="account__info-text">
              <span className="account__info-label">Membre depuis</span>
              <strong className="account__info-value">{createdAt}</strong>
            </div>
          </div>
        </div>
      </section>

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
                        × {item.quantity} — {format(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="order__meta">
                  <span className={`payment-method payment-method--${(order.paymentMethod || 'CARD').toLowerCase()}`}>
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? '—'}
                  </span>
                  <span className={`payment-status payment-status--${(order.paymentStatus || '').toLowerCase()}`}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? ''}
                  </span>
                </div>
                <div className="order__total">
                  Total : <strong>{format(order.total)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}