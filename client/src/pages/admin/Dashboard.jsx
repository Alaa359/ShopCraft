import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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

function formatEuro(value) {
  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---- Données ----

// Série jour par jour : revenus + nombre de commandes sur la période
function buildRevOrdersSeries(orders, days) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const revenues = new Map();
  const counts = new Map();
  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;
    const k = keyOf(new Date(order.createdAt));
    revenues.set(k, (revenues.get(k) || 0) + Number(order.total));
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const k = keyOf(d);
    out.push({
      key: k,
      label: d.getDate(),
      tooltip: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      revenue: revenues.get(k) ?? 0,
      orders: counts.get(k) ?? 0,
    });
  }
  return out;
}

// Répartition du chiffre d'affaires par catégorie
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

// ---- Petits composants visuels ----

// Donut de stock texturé (motifs SVG : plein, rayures, pois)
const STOCK_PATTERNS = (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
    <defs>
      <pattern id="p-stripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="transparent" />
        <rect width="3" height="7" fill="#1A1A1A" />
      </pattern>
      <pattern id="p-dots" width="9" height="9" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="transparent" />
        <circle cx="2.4" cy="2.4" r="1.7" fill="#1A1A1A" />
      </pattern>
      <pattern id="p-stripes-gray" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="7" height="7" fill="transparent" />
        <rect width="3" height="7" fill="#8C9690" />
      </pattern>
    </defs>
  </svg>
);

// Carte statistique pastel (une couleur par carte)
function StatCard({ tone, icon, label, value, sub, link }) {
  return (
    <div className={`dash-stat dash-stat--${tone}`}>
      <div className="dash-stat__head">
        <span className="dash-stat__icon">{icon}</span>
        {link && (
          <Link to={link} className="dash-stat__link" title="Voir détail" aria-label="Voir détail">
            ↗
          </Link>
        )}
      </div>
      <strong className="dash-stat__value">{value}</strong>
      <span className="dash-stat__label">{label}</span>
      <span className="dash-stat__sub">{sub}</span>
    </div>
  );
}

// Info-bulle flottante du graphique (carte sombre)
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const tip = payload[0]?.payload;
  return (
    <div className="dash-chart__tip">
      <strong>{tip?.tooltip ?? label}</strong>
      <span className="dash-chart__tip-row">
        <i className="is-rev" /> Revenue : <b>{formatEuro(tip?.revenue ?? 0)} €</b>
      </span>
      <span className="dash-chart__tip-row">
        <i className="is-orders" /> Orders : <b>{tip?.orders ?? 0}</b>
      </span>
    </div>
  );
}

// Mini barres texturées (complétées / en livraison / en attente / annulées)
function MiniBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="dash-minibars">
      {data.map((d) => (
        <div className="dash-minibar" key={d.label}>
          <strong className="dash-minibar__value">{d.value}</strong>
          <div className="dash-minibar__track">
            <span
              className={`dash-minibar__bar ${d.cls}`}
              style={{ height: `${Math.max(7, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
          <span className="dash-minibar__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Squelettes affichés pendant le chargement
function DashboardSkeleton() {
  return (
    <>
      <div className="skeleton__block" style={{ width: '60%', height: 30 }} />
      <section className="dash-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="dash-stat dash-stat--white" key={i}>
            <div className="skeleton__block" style={{ width: 80, height: 46, borderRadius: 10 }} />
            <div className="skeleton__block" style={{ width: '55%', height: 14, marginTop: 14 }} />
          </div>
        ))}
      </section>
      <section className="dash-row dash-row--main">
        <div className="skeleton__block" style={{ width: '100%', height: 340, borderRadius: 28 }} />
        <div className="skeleton__block" style={{ width: '100%', height: 340, borderRadius: 28 }} />
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

  const days = Number(period) || 30;
  const revOrdersSeries = useMemo(() => buildRevOrdersSeries(orders, days), [orders, days]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categoryRevenue = useMemo(
    () => buildCategoryRevenue(orders, productById),
    [orders, productById]
  );

  const lastOrders = orders.slice(0, 5);
  const lowStock = products
    .filter((p) => p.stock <= LOW_STOCK_LIMIT)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const categoryMax = Math.max(1, ...categoryRevenue.map(([, v]) => v));
  const categoryTotal = categoryRevenue.reduce((s, [, v]) => s + v, 0);

  const periodRevenue = revOrdersSeries.reduce((s, d) => s + d.revenue, 0);
  const todayRevenue = revOrdersSeries.at(-1)?.revenue ?? 0;
  const todayOrders = revOrdersSeries.at(-1)?.orders ?? 0;

  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');
  const cancelledTotal = cancelledOrders.reduce((s, o) => s + Number(o.total), 0);

  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const ratio = orders.length > 0 ? activeOrders.length / orders.length : 0;

  // Barres de la carte "Commandes"
  const orderBars = useMemo(() => {
    const count = (status) => orders.filter((o) => o.status === status).length;
    return [
      { label: 'Complétées', value: count('DELIVERED'), cls: 'is-solid' },
      { label: 'En livraison', value: count('SHIPPED'), cls: 'is-stripes' },
      { label: 'En attente', value: count('PENDING'), cls: 'is-dots' },
      { label: 'Annulées', value: count('CANCELLED'), cls: 'is-light' },
    ];
  }, [orders]);

  // Répartition du stock en 4 états (textures distinctes)
  const stockBuckets = useMemo(() => {
    const orderedIds = new Set(
      orders.flatMap((o) => (o.status === 'CANCELLED' ? [] : (o.items ?? []).map((it) => it.productId)))
    );
    const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);
    const acc = new Map();
    for (const p of products) {
      if (p.stock > LOW_STOCK_LIMIT) inc(acc, 'ok');
      else if (p.stock > 0) inc(acc, 'low');
      else if (orderedIds.has(p.id)) inc(acc, 'out');
      else inc(acc, 'dead');
    }
    const v = (k) => acc.get(k) ?? 0;
    return [
      { label: 'En stock', value: v('ok'), fill: '#1A1A1A' },
      { label: 'Stock faible', value: v('low'), fill: 'url(#p-stripes)' },
      { label: 'Rupture', value: v('out'), fill: 'url(#p-dots)' },
      { label: 'Stock mort', value: v('dead'), fill: 'url(#p-stripes-gray)' },
    ];
  }, [orders, products]);
  const stockTotal = stockBuckets.reduce((s, b) => s + b.value, 0);

  // Produits les plus vendus : complétés avec le prix du catalogue
  const topProductsEnriched = (stats?.topProducts ?? []).map((p) => {
    const catalog = products.find((x) => x.id === p.productId);
    return { ...p, price: catalog?.price };
  });
  const topSoldMax = topProductsEnriched.length
    ? Math.max(...topProductsEnriched.map((p) => p.quantitySold))
    : 1;

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

  const icons = {
    sales: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 9.5c-.5-1.2-1.7-2-3-2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 1 1 0 5.4c-1.3 0-2.5-.8-3-2M12 6.5v2M12 14.5v2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M7 6V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V6M6 6l1 13a1.8 1.8 0 0 0 1.8 1.6h6.4A1.8 1.8 0 0 0 17 19l1-13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.8 19.2c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6M16.2 5.2a3.2 3.2 0 0 1 0 5.7M18 14.9c1.4.7 2.6 2 3.2 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    refund: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M7 6V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V6M6 6l1 13a1.8 1.8 0 0 0 1.8 1.6h6.4A1.8 1.8 0 0 0 17 19l1-13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9 13.5l2 2 4-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="admin">
      {error && <p className="auth__error">{error}</p>}

      {STOCK_PATTERNS}

      {/* ---------- Hero jaune : bienvenue + période ---------- */}
      <section className="dash-hero">
        <div className="dash-hero__left">
          <span className="dash-hero__avatar">{avatarInitial}</span>
          <div className="dash-hero__text">
            <h1 className="dash-hero__title">
              Bonjour {firstName}, voici ce qui se passe dans votre boutique.
            </h1>
            <p className="dash-hero__sub">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="dash-hero__pills" role="group" aria-label="Période affichée">
          {PERIODS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`dash-pill ${period === opt.value ? 'is-active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {icons.calendar}
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Cartes statistiques pastel ---------- */}
      <section className="dash-stats">
        <StatCard
          tone="yellow"
          icon={icons.sales}
          label="Ventes totales"
          value={`${formatEuro(stats?.totalRevenue ?? 0)} €`}
          sub={`${todayRevenue ? `+${formatEuro(todayRevenue)} €` : '0,00 €'} aujourd'hui`}
          link="/admin/orders"
        />
        <StatCard
          tone="blue"
          icon={icons.orders}
          label="Total commandes"
          value={String(stats?.ordersCount ?? 0)}
          sub={`+${todayOrders} aujourd'hui`}
        />
        <StatCard
          tone="green"
          icon={icons.users}
          label="Clients"
          value={String(stats?.usersCount ?? 0)}
          sub={`${Math.round(ratio * 100)} % de commandes abouties`}
        />
        <StatCard
          tone="white"
          icon={icons.refund}
          label="Remboursés"
          value={String(cancelledOrders.length)}
          sub={`${formatEuro(cancelledTotal)} € annulés`}
        />
      </section>

      {/* ---------- Revenus vs commandes + commandes complétées ---------- */}
      <section className="dash-row dash-row--main">
        <div className="dash-card dash-card--blue">
          <div className="dash-card__head">
            <div>
              <h2 className="dash-card__title">Revenus vs Commandes</h2>
              <p className="dash-card__sub">
                {periodRevenue ? `${formatEuro(periodRevenue)} €` : 'Aucun revenu'} sur {days} jours
              </p>
            </div>
            <div className="dash-legend">
              <span className="dash-legend__item">
                <i className="dash-legend__dot is-rev" /> Revenue
              </span>
              <span className="dash-legend__item">
                <i className="dash-legend__dot is-orders" /> Orders
              </span>
            </div>
          </div>

          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revOrdersSeries} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="#C6CFD7" strokeDasharray="3 8" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#5F6B75', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fill: '#5F6B75', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : v)}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#1A1A1A', strokeDasharray: '4 4' }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#1A1A1A"
                  strokeWidth={2.6}
                  strokeDasharray="7 6"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#6E7C88"
                  strokeWidth={2.4}
                  strokeDasharray="2 6"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#D4DCE3' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-card dash-card--blue">
          <div className="dash-card__head">
            <div>
              <h2 className="dash-card__title">Commandes complétées</h2>
              <p className="dash-card__sub">Répartition par statut</p>
            </div>
            <span className="dash-chip">{stats?.ordersCount ?? 0} au total</span>
          </div>

          <MiniBars data={orderBars} />

          <h3 className="dash-mini-title">Chiffre d'affaires par catégorie</h3>
          <ul className="dash-bars">
            {categoryRevenue.length === 0 && (
              <li className="home__message dash-bars__empty">Aucune donnée pour le moment.</li>
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
            {categoryRevenue.length > 0 && (
              <li className="dash-bar dash-bar--total">
                <span className="dash-bar__label">Total</span>
                <div className="dash-bar__track" />
                <strong className="dash-bar__value">{formatEuro(categoryTotal)} €</strong>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ---------- Meilleures ventes + stock ---------- */}
      <section className="dash-row dash-row--second">
        <div className="dash-card dash-card--white">
          <div className="dash-card__head">
            <h2 className="dash-card__title">Meilleures ventes</h2>
            <Link to="/admin/products" className="dash-card__link">
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
                    <span className="dash-best__bar-wrap">
                      <span
                        className="dash-best__bar"
                        style={{ width: `${Math.max(6, Math.round((product.quantitySold / topSoldMax) * 100))}%` }}
                      />
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

        <div className="dash-card dash-card--green">
          <div className="dash-card__head">
            <h2 className="dash-card__title">Stock / Inventaire</h2>
            <span className="dash-chip dash-chip--dark">{stockTotal} produits</span>
          </div>

          <div className="dash-stockbox">
            <div className="dash-donut-wrap">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={stockBuckets}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="60%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {stockBuckets.map((bucket) => (
                      <Cell key={bucket.label} fill={bucket.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      fontSize: 13,
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut__center">
                <strong>{stockTotal}</strong>
                <span>unités</span>
              </div>
            </div>

            <ul className="dash-legend-list">
              {stockBuckets.map((bucket) => (
                <li key={bucket.label}>
                  <i
                    className="dash-legend-swatch"
                    style={{ background: bucket.fill }}
                  />
                  <span>{bucket.label}</span>
                  <b>{bucket.value}</b>
                </li>
              ))}
            </ul>
          </div>

          <h3 className="dash-mini-title">Alertes stock faible</h3>
          {lowStock.length === 0 && <p className="home__message">Aucun produit en stock faible.</p>}
          {lowStock.length > 0 && (
            <ul className="admin__alerts">
              {lowStock.map((product) => (
                <li className="admin__alert-item" key={product.id}>
                  <span className="admin__alert-name">{product.name}</span>
                  <span
                    className={`admin__stock ${product.stock === 0 ? 'admin__stock--out' : 'admin__stock--low'}`}
                  >
                    {product.stock === 0 ? 'Rupture' : `${product.stock} restant${product.stock > 1 ? 's' : ''}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- Commandes récentes ---------- */}
      <section className="dash-card dash-card--white">
        <div className="dash-card__head">
          <h2 className="dash-card__title">Commandes récentes</h2>
          <Link to="/admin/orders" className="dash-card__link">
            Voir toutes →
          </Link>
        </div>

        {lastOrders.length === 0 && <p className="home__message">Aucune commande pour le moment.</p>}

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
                      <span className={`order__status order__status--${order.status.toLowerCase()}`}>
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