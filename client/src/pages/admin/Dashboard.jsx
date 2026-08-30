import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getStats } from '../../api/client.js';

// Page d'accueil du dashboard admin : indicateurs + produits les plus vendus
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
    return <p className="home__message">Chargement des statistiques...</p>;
  }

  const cards = stats
    ? [
        { label: 'Revenus totaux', value: `${Number(stats.totalRevenue).toFixed(2)} €` },
        { label: 'Commandes', value: stats.ordersCount },
        { label: 'En attente', value: stats.pendingOrders },
        { label: 'Utilisateurs', value: stats.usersCount },
      ]
    : [];

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Dashboard</h1>
        <div className="admin__actions">
          <Link to="/admin/products" className="btn btn--primary">
            Gérer les produits
          </Link>
          <Link to="/admin/orders" className="btn btn--primary">
            Gérer les commandes
          </Link>
        </div>
      </header>

      {error && <p className="auth__error">{error}</p>}

      <section className="admin__cards">
        {cards.map((card) => (
          <div className="admin__card" key={card.label}>
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