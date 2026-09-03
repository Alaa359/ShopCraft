import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getAllOrders, updateOrderStatus } from '../../api/client.js';
import { useAdminSearch } from '../../components/AdminLayout.jsx';
import { lookupCountry } from '../../lib/countries.js';
import { useCurrency } from '../../lib/useCurrency.js';

// Libellés français des statuts
const STATUS_LABELS = {
  PENDING: 'En attente',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

// Libellés des méthodes et statuts de paiement
const PAYMENT_METHOD_LABELS = {
  CARD: 'Carte',
  CASH: 'Espèces',
};

const PAYMENT_STATUS_LABELS = {
  PAID: 'Payé',
  UNPAID: 'À payer',
};

const STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const STATUS_TABS = [
  { value: '', label: 'Toutes' },
  ...STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];
const DATE_OPTIONS = [
  { value: '', label: 'Toutes les dates' },
  { value: '7', label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
  { value: '90', label: '90 derniers jours' },
];

// Squelette de tableau pendant le chargement
function TableSkeleton() {
  const cols = ['Commande', 'Client', 'Date', 'Articles', 'Total', 'Paiement', 'Statut', 'Détails'];
  return (
    <table className="admin__table admin__table--skeleton">
      <thead>
        <tr>
          {cols.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }).map((_, row) => (
          <tr key={row}>
            {cols.map((__, col) => (
              <td key={col}>
                <div className="skeleton__block" style={{ height: 16, width: '80%' }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Icône "voir le détail"
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Page admin : suivi des commandes + changement de statut + détail
export default function OrdersAdmin() {
  const token = useAuthStore((state) => state.token);
  const { format } = useCurrency();

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [detail, setDetail] = useState(null); // commande affichée dans la modal

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllOrders(token, statusFilter)
      .then((data) => !cancelled && setOrders(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [token, statusFilter]);

  // Filtre par période appliqué côté client (après le filtre serveur par statut)
  const days = Number(dateFilter) || 0;
  const dateFiltered = days
    ? orders.filter((o) => Date.now() - new Date(o.createdAt).getTime() <= days * 86400000)
    : orders;

  // Recherche du bandeau admin : référence de commande ou email client
  const { search } = useAdminSearch();
  const query = search.trim().toLowerCase();
  const visibleOrders = useMemo(
    () =>
      query
        ? dateFiltered.filter(
            (o) =>
              o.id.toLowerCase().includes(query) ||
              (o.user?.email ?? '').toLowerCase().includes(query)
          )
        : dateFiltered,
    [dateFiltered, query]
  );

  // Change le statut d'une commande puis met à jour la liste
  async function handleStatusChange(orderId, status) {
    setUpdatingId(orderId);
    setError(null);
    try {
      await updateOrderStatus(token, orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      // Synchronise la commande ouverte dans la modal si besoin
      setDetail((prev) => (prev && prev.id === orderId ? { ...prev, status } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Commandes</h1>
        <label className="admin__filter-wrap">
          <span className="admin__filter-label">Période</span>
          <select
            className="admin__filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* Filtres par statut (onglets) */}
      <div className="admin__tabs" role="tablist" aria-label="Filtrer par statut">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.value}
            className={`admin__tab ${statusFilter === tab.value ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="auth__error">{error}</p>}
      {loading && (
        <section className="admin__panel">
          <div className="admin__table-wrap">
            <TableSkeleton />
          </div>
        </section>
      )}

      {!loading && visibleOrders.length === 0 && (
        <div className="admin__panel">
          <p className="home__message">
            {orders.length === 0
              ? 'Aucune commande pour le moment.'
              : query
                ? 'Aucune commande ne correspond à cette recherche.'
                : 'Aucune commande ne correspond à ce filtre.'}
          </p>
        </div>
      )}

      {!loading && visibleOrders.length > 0 && (
        <section className="admin__panel">
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Articles</th>
                  <th>Total</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="admin__id">#{order.id.slice(-8).toUpperCase()}</td>
                    <td>{order.user?.email ?? '—'}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <ul className="admin__items">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <Link to={`/products/${item.product.id}`}>{item.product.name}</Link> ×{' '}
                            {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{format(order.total)}</td>
                    <td>
                      <span className={`payment-method payment-method--${(order.paymentMethod || 'CARD').toLowerCase()}`}>
                        {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? '—'}
                      </span>
                      <span className={`payment-status payment-status--${(order.paymentStatus || '').toLowerCase()}`}>
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? ''}
                      </span>
                    </td>
                    <td>
                      {/* Badge cliquable : le menu invite à changer de statut */}
                      <select
                        className={`admin__status admin__status--pill admin__status--${order.status.toLowerCase()}`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        aria-label={`Statut : ${STATUS_LABELS[order.status]}`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin__icon-btn"
                        onClick={() => setDetail(order)}
                        title="Voir le détail"
                        aria-label={`Voir le détail de la commande #${order.id.slice(-8).toUpperCase()}`}
                      >
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Modal détail commande ---------- */}
      {detail && (
        <div className="modal-overlay" onMouseDown={() => setDetail(null)}>
          <div
            className="modal modal--wide"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal__head">
              <h2 className="modal__title">
                Commande #{detail.id.slice(-8).toUpperCase()}
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setDetail(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </header>

            <div className="order-detail">
              <div className="order-detail__grid">
                <div className="order-detail__cell">
                  <span className="order-detail__label">Client</span>
                  <span className="order-detail__value">{detail.user?.email ?? '—'}</span>
                </div>
                <div className="order-detail__cell">
                  <span className="order-detail__label">Date</span>
                  <span className="order-detail__value">
                    {new Date(detail.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="order-detail__cell">
                  <span className="order-detail__label">Statut</span>
                  <span className={`order__status order__status--${detail.status.toLowerCase()}`}>
                    {STATUS_LABELS[detail.status] ?? detail.status}
                  </span>
                </div>
                <div className="order-detail__cell">
                  <span className="order-detail__label">Total</span>
                  <span className="order-detail__value order-detail__value--total">
                    {format(detail.total)}
                  </span>
                </div>
                <div className="order-detail__cell">
                  <span className="order-detail__label">Paiement</span>
                  <span className="order-detail__value">
                    <span className={`payment-method payment-method--${(detail.paymentMethod || 'CARD').toLowerCase()}`}>
                      {PAYMENT_METHOD_LABELS[detail.paymentMethod] ?? '—'}
                    </span>
                    <span className={`payment-status payment-status--${(detail.paymentStatus || '').toLowerCase()}`}>
                      {PAYMENT_STATUS_LABELS[detail.paymentStatus] ?? ''}
                    </span>
                  </span>
                </div>
              </div>

              {/* Informations de livraison */}
              <h3 className="order-detail__sub">Livraison</h3>
              <div className="order-detail__delivery">
                <div className="order-detail__delivery-row">
                  <span className="order-detail__label">Destinataire</span>
                  <span className="order-detail__value">
                    {detail.fullName} — {detail.phone}
                  </span>
                </div>
                <div className="order-detail__delivery-row">
                  <span className="order-detail__label">Adresse</span>
                  <span className="order-detail__value">
                    {detail.address}, {detail.postalCode} {detail.city},{' '}
                    {lookupCountry(detail.country)?.name ?? detail.country}
                  </span>
                </div>
                <div className="order-detail__delivery-row">
                  <span className="order-detail__label">Email</span>
                  <span className="order-detail__value">{detail.email || detail.user?.email || '—'}</span>
                </div>
                {detail.note && (
                  <div className="order-detail__delivery-row">
                    <span className="order-detail__label">Note</span>
                    <span className="order-detail__value">{detail.note}</span>
                  </div>
                )}
              </div>

              <h3 className="order-detail__sub">Articles</h3>
              <ul className="order-detail__items">
                {detail.items.map((item) => (
                  <li className="order-detail__item" key={item.id}>
                    {item.product?.images?.[0] ? (
                      <img className="order-detail__thumb" src={item.product.images[0]} alt="" />
                    ) : (
                      <div className="order-detail__thumb order-detail__thumb--empty" />
                    )}
                    <span className="order-detail__item-name">
                      <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
                    </span>
                    <span className="order-detail__item-qty">
                      {item.quantity} × {format(item.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}