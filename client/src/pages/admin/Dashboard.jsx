import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getStats, getAllOrders, getProducts } from '../../api/client.js';

// Seuil "stock faible" pour les alertes du dashboard
const LOW_STOCK_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS = {
  PENDING: 'En attente',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const PERIODS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
];

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

// Calcule les variations (%) entre la période choisie et la précédente
function computeDeltas(orders, days) {
  const window = days * DAY_MS;
  const now = Date.now();
  let curRevenue = 0;
  let prevRevenue = 0;
  let curCount = 0;
  let prevCount = 0;

  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;
    const age = now - new Date(order.createdAt).getTime();
    if (age <= window) {
      curRevenue += Number(order.total);
      curCount += 1;
    } else if (age <= 2 * window) {
      prevRevenue += Number(order.total);
      prevCount += 1;
    }
  }

  const pct = (cur, prev) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? null : 0;

  return { revenueDelta: pct(curRevenue, prevRevenue), ordersDelta: pct(curCount, prevCount) };
}

// Série de revenus par jour sur la période (jours sans vente = 0)
function buildRevenueSeries(orders, days) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const totals = new Map();
  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;
    const k = keyOf(new Date(order.createdAt));
    totals.set(k, (totals.get(k) || 0) + Number(order.total));
  }

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    series.push({
      label: d.getDate(),
      shortMonth: d.toLocaleDateString('fr-FR', { month: 'short' }),
      total: totals.get(keyOf(d)) ?? 0,
    });
  }
  return series;
}

// Répartition du chiffre d'affaires par catégorie (à partir des commandes,
// catégorie retrouvée via le catalogue si absente du serveur)
function buildCategoryRevenue(orders, productById) {
  const map = new Map();
  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;
    for (const item of order.items ?? []) {
      const cat =
        item.product?.category || productById.get(item.productId)?.category || 'Autre';
      map.set(cat, (map.get(cat) || 0) + item.quantity * Number(item.price));
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// Stock total par catégorie (à partir du catalogue)
function buildStockByCategory(products) {
  const map = new Map();
  for (const product of products) {
    map.set(product.category, (map.get(product.category) || 0) + Number(product.stock));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// Courbe de chiffre d'affaires en SVG pur
function RevenueChart({ series }) {
  const W = 640;
  const H = 190;
  const PAD = 14;
  const AXIS = 26;
  const innerW = W - 2 * PAD;
  const innerH = H - PAD - AXIS;
  const max = Math.max(...series.map((s) => s.total));

  if (!max) {
    return (
      <div className="chart__empty">
        Aucune vente sur cette période. Les revenus apparaîtront ici dès la première commande.
      </div>
    );
  }

  const n = series.length;
  const X = (i) => (n <= 1 ? PAD + innerW / 2 : PAD + (i * innerW) / (n - 1));
  const Y = (v) => PAD + innerH - (v / max) * innerH;
  const baseline = PAD + innerH;

  const linePoints = series.map((s, i) => `${X(i)},${Y(s.total)}`).join(' ');
  const areaPoints = `${X(0)},${baseline} ${linePoints} ${X(n - 1)},${baseline}`;
  const xStep = Math.max(1, Math.ceil(n / 8));
  const showLabel = (i) => n <= 12 || i % 2 === 0;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Courbe du chiffre d'affaires quotidien"
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={Y(max * f)}
          y2={Y(max * f)}
          className="chart__grid"
        />
      ))}

      <polygon points={areaPoints} fill="url(#chartFill)" />
      <polyline points={linePoints} fill="none" className="chart__line" vectorEffect="non-scaling-stroke" />

      {series.map((s, i) => (
        <circle key={i} cx={X(i)} cy={Y(s.total)} r="3.5" className="chart__dot">
          <title>{`${s.label} ${s.shortMonth} — ${s.total.toLocaleString('fr-FR')} €`}</title>
        </circle>
      ))}

      {series.map((s, i) =>
        i % xStep === 0 && showLabel(i) ? (
          <text key={`x${i}`} x={X(i)} y={H - 8} className="chart__xlabel" textAnchor="middle">
            {n <= 31 ? s.label : `${s.label} ${s.shortMonth}`}
          </text>
        ) : null
      )}

      <text x={W - PAD} y={Y(max) - 6} className="chart__ylabel" textAnchor="end">
        {max.toLocaleString('fr-FR')} €
      </text>
    </svg>
  );
}

// Donut de livraison (part des commandes livrées)
function RetentionDonut({ ratio }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const pct = Math.round(ratio * 100);
  return (
    <div className="dash-donut">
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={R} fill="none" className="dash-donut__track" />
        <circle
          cx="42"
          cy="42"
          r={R}
          fill="none"
          className="dash-donut__value"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <div className="dash-donut__center">
        <strong>{pct}%</strong>
        <span>livrées</span>
      </div>
    </div>
  );
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
      <div className="skeleton__block skeleton__block--wide" />
      <section className="admin__cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="admin__card" key={i}>
            <div className="skeleton__block" style={{ width: 36, height: 36, borderRadius: 12 }} />
            <div className="skeleton__block" style={{ width: '55%', height: 12, marginTop: 10 }} />
            <div className="skeleton__block" style={{ width: '80%', height: 28, marginTop: 6 }} />
          </div>
        ))}
      </section>
      <section className="admin__dash-split">
        <div className="admin__panel">
          <div className="skeleton__block" style={{ width: 190, height: 22 }} />
          <div className="skeleton__block" style={{ width: '100%', height: 170, marginTop: 18 }} />
        </div>
        <div className="admin__panel">
          <div className="skeleton__block" style={{ width: 160, height: 22 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="skeleton__block" key={i} style={{ width: '100%', height: 40, marginTop: 14 }} />
          ))}
        </div>
      </section>
      <section className="admin__panel">
        <div className="skeleton__block" style={{ width: 200, height: 22 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="skeleton__block" key={i} style={{ width: '100%', height: 40, marginTop: 14 }} />
        ))}
      </section>
    </>
  );
}

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('30');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    Promise.all([getStats(token), getAllOrders(token), getProducts({})])
      .then(([statsData, ordersData, productsData]) => {
        setStats(statsData);
        setOrders(ordersData);
        setProducts(productsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Horloge de la carte de bienvenue (mise à jour toutes les 30 s)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const days = Number(period) || 30;
  const deltas = useMemo(() => computeDeltas(orders, days), [orders, days]);
  const revenueSeries = useMemo(() => buildRevenueSeries(orders, days), [orders, days]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categoryRevenue = useMemo(
    () => buildCategoryRevenue(orders, productById),
    [orders, productById]
  );
  const stockByCategory = useMemo(() => buildStockByCategory(products), [products]);

  const lastOrders = orders.slice(0, 5);
  const lowStock = products
    .filter((p) => p.stock <= LOW_STOCK_LIMIT)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const topSoldMax = stats?.topProducts?.length
    ? Math.max(...stats.topProducts.map((p) => p.quantitySold))
    : 1;
  const categoryMax = Math.max(1, ...categoryRevenue.map(([, v]) => v));
  const stockMax = Math.max(1, ...stockByCategory.map(([, v]) => v));

  const periodRevenue = revenueSeries.reduce((s, d) => s + d.total, 0);
  const periodOrders = orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    return Date.now() - new Date(o.createdAt).getTime() <= days * DAY_MS;
  }).length;

  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const ratio =
    orders.length > 0
      ? activeOrders.length / orders.length
      : 0;

  // Produits les plus vendus : on complète avec le prix du catalogue
  const topProductsEnriched = (stats?.topProducts ?? []).map((p) => {
    const catalog = products.find((x) => x.id === p.productId);
    return { ...p, price: catalog?.price };
  });

  if (loading) {
    return (
      <div className="admin">
        <DashboardSkeleton />
      </div>
    );
  }

  const firstName =
    user?.name ||
    (user?.email ? user.email.charAt(0).toUpperCase() + user.email.slice(1, user.email.indexOf('@')) : 'Admin');
  const avatarInitial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  const cards = stats
    ? [
        {
          key: 'revenus',
          icon: 'revenus',
          label: 'Revenus totaux',
          value: `${formatEuro(stats.totalRevenue)} €`,
          delta: deltas.revenueDelta,
          sub: `vs ${days} derniers jours`,
        },
        {
          key: 'commandes',
          icon: 'commandes',
          label: 'Commandes',
          value: String(stats.ordersCount),
          delta: deltas.ordersDelta,
          sub: `vs ${days} derniers jours`,
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
          sub: `${stats.topRated.reduce((s, p) => s + p.reviewCount, 0)} avis clients`,
        },
      ]
    : [];

  return (
    <div className="admin">
      {error && <p className="auth__error">{error}</p>}

      {/* ---------- Carte de bienvenue ---------- */}
      <section className="dash-welcome">
        <div className="dash-welcome__left">
          <span className="dash-welcome__avatar">{avatarInitial}</span>
          <div>
            <p className="dash-welcome__hello">Bon retour, {firstName}</p>
            <p className="dash-welcome__sub">Espace administrateur · ShopCraft</p>
          </div>
        </div>
        <div className="dash-welcome__right">
          <p className="dash-welcome__time">
            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="dash-welcome__date">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </section>

      {/* ---------- Cartes statistiques ---------- */}
      <section className="admin__cards">
        {cards.map((card) => (
          <div className="admin__card" key={card.key}>
            <div className="admin__card-top">
              <span className="admin__card-icon">
                <CardIcon type={card.icon} />
              </span>
              {card.delta !== null && card.delta !== undefined && (
                <span
                  className={`admin__card-delta ${card.delta >= 0 ? 'admin__card-delta--up' : 'admin__card-delta--down'}`}
                  title={card.delta >= 0 ? 'Hausse' : 'Baisse'}
                >
                  {card.delta >= 0 ? '▲' : '▼'} {Math.abs(card.delta)} %
                </span>
              )}
            </div>
            <span className="admin__card-label">{card.label}</span>
            <span className="admin__card-value">{card.value}</span>
            {card.sub && <span className="admin__card-sub">{card.sub}</span>}
          </div>
        ))}
      </section>

      {/* ---------- Meilleures ventes + aperçu clients ---------- */}
      <section className="admin__dash-split">
        <div className="admin__panel">
          <div className="admin__panel-head">
            <h2 className="admin__panel-title admin__panel-title--inline">Meilleures ventes</h2>
            <Link to="/admin/products" className="admin__link">
              Voir tout →
            </Link>
          </div>
          {topProductsEnriched.length === 0 && (
            <p className="home__message">Aucune vente pour le moment.</p>
          )}
          {topProductsEnriched.length > 0 && (
            <ul className="dash-best">
              {topProductsEnriched.map((product, index) => (
                <li className="dash-best__item" key={product.productId}>
                  <span className="dash-best__rank">{index + 1}</span>
                  {product.image ? (
                    <img className="dash-best__thumb" src={product.image} alt={product.name} />
                  ) : (
                    <div className="dash-best__thumb dash-best__thumb--empty" />
                  )}
                  <div className="dash-best__info">
                    <Link to={`/products/${product.productId}`} className="dash-best__name">
                      {product.name}
                    </Link>
                    <span className="dash-best__meta">
                      {product.price ? `${formatEuro(product.price)} €` : '—'}
                    </span>
                  </div>
                  <span className="dash-best__sales">
                    {product.quantitySold} {product.quantitySold > 1 ? 'ventes' : 'vente'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin__panel">
          <h2 className="admin__panel-title">Aperçu clients</h2>
          <div className="dash-client">
            <RetentionDonut ratio={ratio} />
            <div className="dash-client__notes">
              <p>
                <strong>{stats.usersCount}</strong> client{stats.usersCount > 1 ? 's' : ''} inscrit
                {stats.usersCount > 1 ? 's' : ''}
              </p>
              <p>
                <strong>{Math.round(ratio * 100)} %</strong> de commandes non annulées
              </p>
            </div>
          </div>
          <h3 className="dash-sub">Chiffre d'affaires par catégorie</h3>
          <ul className="dash-bars">
            {categoryRevenue.length === 0 && (
              <li className="home__message home__message--bare">Aucune donnée pour le moment.</li>
            )}
            {categoryRevenue.map(([category, value]) => (
              <li className="dash-bar" key={category}>
                <span className="dash-bar__label">{category}</span>
                <div className="dash-bar__track">
                  <span
                    className="dash-bar__fill"
                    style={{ width: `${Math.round((value / categoryMax) * 100)}%` }}
                  />
                </div>
                <strong className="dash-bar__value">{formatEuro(value)} €</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Aperçu des commandes + stock ---------- */}
      <section className="admin__dash-split">
        <div className="admin__panel">
          <div className="admin__panel-head">
            <div>
              <h2 className="admin__panel-title admin__panel-title--inline">
                Aperçu des commandes
              </h2>
              <p className="admin__panel-sub">
                {periodOrders} commande{periodOrders > 1 ? 's' : ''} ·{' '}
                <strong>{formatEuro(periodRevenue)} €</strong> sur {days} jours
              </p>
            </div>
            <label className="admin__filter-wrap">
              <span className="admin__filter-label">Période</span>
              <select
                className="admin__filter"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIODS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="chart__wrap">
            <RevenueChart series={revenueSeries} />
          </div>
        </div>

        <div className="admin__panel">
          <div className="admin__panel-head">
            <h2 className="admin__panel-title admin__panel-title--inline">Stock / Inventaire</h2>
            {lowStock.length > 0 && <span className="admin__alert-count">{lowStock.length}</span>}
          </div>
          <div className="dash-stock">
            <p className="dash-sub">Unités par catégorie</p>
            <div className="dash-stockchart" role="img" aria-label="Répartition du stock par catégorie">
              {stockByCategory.map(([category, value]) => (
                <div className="dash-stockchart__col" key={category}>
                  <span
                    className="dash-stockchart__bar"
                    style={{ height: `${Math.max(6, Math.round((value / stockMax) * 100))}%` }}
                    title={`${category} — ${value} unités`}
                  />
                  <span className="dash-stockchart__label" title={category}>
                    {category.slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>

            <h3 className="dash-sub">Alertes stock faible</h3>
            {lowStock.length === 0 && (
              <p className="home__message">Aucun produit en stock faible.</p>
            )}
            {lowStock.length > 0 && (
              <ul className="admin__alerts">
                {lowStock.map((product) => (
                  <li className="admin__alert-item" key={product.id}>
                    <span className="admin__alert-name">{product.name}</span>
                    <span
                      className={`admin__stock ${product.stock === 0 ? 'admin__stock--out' : 'admin__stock--low'}`}
                    >
                      {product.stock === 0
                        ? 'Rupture'
                        : `${product.stock} restant${product.stock > 1 ? 's' : ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Commandes récentes ---------- */}
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h2 className="admin__panel-title admin__panel-title--inline">Commandes récentes</h2>
          <Link to="/admin/orders" className="admin__link">
            Voir toutes →
          </Link>
        </div>

        {lastOrders.length === 0 && (
          <p className="home__message">Aucune commande pour le moment.</p>
        )}

        {lastOrders.length > 0 && (
          <div className="admin__table-wrap">
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
          </div>
        )}
      </section>
    </div>
  );
}