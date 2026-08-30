import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getStats } from '../../api/client.js';

// Page d'accueil du dashboard admin : indicateurs + produits les plus vendus
// Icône SVG associée à chaque carte de statistique
function CardIcon({ type }) {
  if (type === 'revenus') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15 9c-.5-1.2-1.7-2-3-2s-2.6.8-2.6 2 1 1.8 2.6 2.3 2.6 1.1 2.6 2.3-1.7 2-2.6 2-2.5-.8-3-2M12 6v1.5M12 15v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'commandes') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M7 6V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V6M6 6l1 13a1.8 1.8 0 0 0 1.8 1.6h6.4A1.8 1.8 0 0 0 17 19l1-13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'attente') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 20c1.3-3.4 4.3-5 7.5-5s6.2 1.6 7.5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats(token)
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <p className="admin__loading">Chargement des statistiques...</p>;
  }

  const cards = stats
    ? [
        { key: 'revenus', label: 'Revenus totaux', value: `${Number(stats.totalRevenue).toFixed(2)} €` },
        { key: 'commandes', label: 'Commandes', value: stats.ordersCount },
        { key: 'attente', label: 'En attente', value: stats.pendingOrders },
        { key: 'utilisateurs', label: 'Utilisateurs', value: stats.usersCount },
      ]
    : [];

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Dashboard</h1>
      </header>

      {error && <p className="auth__error">{error}</p>}

      <section className="admin__cards">
        {cards.map((card) => (
          <div className="admin__card" key={card.key}>
            <span className="admin__card-icon">
              <CardIcon type={card.key} />
            </span>
            <span className="admin__card-label">{card.label}</span>
            <span className="admin__card-value">{card.value}</span>
          </div>
        ))}
      </section>

      <section className="admin__section">
        <h2 className="admin__subtitle">Produits les plus vendus</h2>

        {stats && stats.topProducts.length === 0 && (
          <p className="home__message">Aucune commande pour le moment.</p>
        )}

        {stats && stats.topProducts.length > 0 && (
          <table className="admin__table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Quantité vendue</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.map((p) => (
                <tr key={p.productId}>
                  <td>
                    <div className="admin__product">
                      {p.image ? (
                        <img className="admin__thumb" src={p.image} alt={p.name} />
                      ) : (
                        <div className="admin__thumb admin__thumb--empty" />
                      )}
                      <Link to={`/products/${p.productId}`}>{p.name}</Link>
                    </div>
                  </td>
                  <td>{p.quantitySold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}