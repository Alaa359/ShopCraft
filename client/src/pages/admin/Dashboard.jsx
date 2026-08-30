import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getStats, getAllOrders } from '../../api/client.js';
import RatingStars from '../../components/RatingStars.jsx';

// Périodes utilisées pour les variations : 30 derniers jours vs 30 précédents
const DELTA_WINDOW = 30 * 24 * 60 * 60 * 1000;
const STATUS_LABELS = {
  PENDING: 'En attente',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

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
  if (type === 'stock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 7l8.5-4 8.5 4-8.5 4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3.5 7v10l8.5 4 8.5-4V7M12 11v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l2.6 5.6 6.1.6-4.6 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.6-4 6.1-.6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Calcule les variations (%) entre les 30 derniers jours et les 30 précédents.
// Renvoie null quand aucune donnée précédente (pas de badge affiché).
function computeDeltas(orders) {
  const now = Date.now();
  let curRevenue = 0;
  let prevRevenue = 0;
  let curCount = 0;
  let prevCount = 0;

  for (const order of orders) {
    if (order.status === 'CANCELLED') continue; // cohérent avec les revenus serveur
    const age = now - new Date(order.createdAt).getTime();
    if (age <= DELTA_WINDOW) {
      curRevenue += order.total;
      curCount += 1;
    } else if (age <= 2 * DELTA_WINDOW) {
      prevRevenue += order.total;
      prevCount += 1;
    }
  }

  const pct = (cur, prev) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? null : 0;

  return { revenueDelta: pct(curRevenue, prevRevenue), ordersDelta: pct(curCount, prevCount) };
}

function formatEuro(value) {
  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Squelettes affichés pendant le chargement
function DashboardSkeleton() {
  return (
    <>
      <section className="admin__cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="admin__card" key={i}>
            <div className="skeleton__block" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <div className="skeleton__block" style={{ width: '55%', height: 12, marginTop: 10 }} />
            <div className="skeleton__block" style={{ width: '80%', height: 28, marginTop: 6 }} />
          </div>
        ))}
      </section>
      <section className="admin__grid2">
        <div className="admin__panel">
          <div className="skeleton__block" style={{ width: 180, height: 22 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skeleton__block" key={i} style={{ width: '100%', height: 40, marginTop: 14 }} />
          ))}
        </div>
        <div className="admin__panel">
          <div className="skeleton__block" style={{ width: 190, height: 22 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skeleton__block" key={i} style={{ width: '100%', height: 44, marginTop: 14 }} />
          ))}
        </div>
      </section>
    </>
  );
}

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(token), getAllOrders(token)])
      .then(([statsData, ordersData]) => {
        setStats(statsData);
        setOrders(ordersData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="admin">
        <header className="admin__header">
          <h1 className="admin__title">Vue d'ensemble</h1>
        </header>
        <DashboardSkeleton />
      </div>
    );
  }

  const deltas = computeDeltas(orders);
  const lastOrders = orders.slice(0, 5);

  const cards = stats
    ? [
        {
          key: 'revenus',
          icon: 'revenus',
          label: 'Revenus totaux',
          value: `${formatEuro(stats.totalRevenue)} €`,
          delta: deltas.revenueDelta,
          sub: 'vs 30 derniers jours',
        },
        {
          key: 'commandes',
          icon: 'commandes',
          label: 'Commandes',
          value: String(stats.ordersCount),
          delta: deltas.ordersDelta,
          sub: 'vs 30 derniers jours',
        },
        {
          key: 'stock',
          icon: 'stock',
          label: 'Produits en stock',
          value: String(stats.stockCount),
          sub: 'unités disponibles',
        },
        {
          key: 'note',
          icon: 'note',
          label: 'Note moyenne',
          value: stats.avgRating ? stats.avgRating.toFixed(1) : '—',
          stars: stats.avgRating,
          sub: `${stats.topRated.reduce((s, p) => s + p.reviewCount, 0)} avis clients`,
        },
      ]
    : [];

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Vue d'ensemble</h1>
      </header>

      {error && <p className="auth__error">{error}</p>}

      <section className="admin__cards">
        {cards.map((card) => (
          <div className="admin__card" key={card.key}>
            <div className="admin__card-top">
              <span className="admin__card-icon">
                <CardIcon type={card.icon} />
              </span>
              {card.delta !== null && card.delta !== undefined && (
                <span
                  className={`admin__delta ${card.delta >= 0 ? 'is-up' : 'is-down'}`}
                  title={card.delta >= 0 ? 'Hausse sur 30 jours' : 'Baisse sur 30 jours'}
                >
                  {card.delta >= 0 ? '▲' : '▼'} {Math.abs(card.delta)} %
                </span>
              )}
            </div>
            <span className="admin__card-label">{card.label}</span>
            <span className="admin__card-value">{card.value}</span>
            {card.stars !== undefined && (
              <span className="admin__card-stars">
                <RatingStars value={card.stars} size="sm" />
              </span>
            )}
            {card.sub && <span className="admin__card-sub">{card.sub}</span>}
          </div>
        ))}
      </section>

      <section className="admin__grid2">
        {/* ---------- Dernières commandes ---------- */}
        <div className="admin__panel">
          <h2 className="admin__subtitle">Dernières commandes</h2>

          {lastOrders.length === 0 && (
            <p className="home__message">Aucune commande pour le moment.</p>
          )}

          {lastOrders.length > 0 && (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {lastOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="admin__id">#{order.id.slice(-8).toUpperCase()}</td>
                    <td>{order.user?.email ?? '—'}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>{Number(order.total).toFixed(2)} €</td>
                    <td>
                      <span
                        className={`order__status order__status--${order.status.toLowerCase()}`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ---------- Produits les mieux notés ---------- */}
        <div className="admin__panel">
          <h2 className="admin__subtitle">Produits les mieux notés</h2>

          {stats.topRated.length === 0 && (
            <p className="home__message">Aucun avis pour le moment.</p>
          )}

          {stats.topRated.length > 0 && (
            <ul className="admin__rated">
              {stats.topRated.map((product) => (
                <li className="admin__rated-item" key={product.productId}>
                  {product.image ? (
                    <img className="admin__thumb" src={product.image} alt={product.name} />
                  ) : (
                    <div className="admin__thumb admin__thumb--empty" />
                  )}
                  <div className="admin__rated-info">
                    <Link to={`/products/${product.productId}`}>{product.name}</Link>
                    <div className="admin__rated-meta">
                      <RatingStars value={product.avgRating} size="sm" />
                      <span>
                        {product.avgRating.toFixed(1)} · {product.reviewCount} avis
                      </span>
                    </div>
                  </div>
                  <span className="admin__rated-sales">
                    {product.quantitySold} vendu{product.quantitySold > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}