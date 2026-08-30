import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getAllOrders, updateOrderStatus } from '../../api/client.js';

// Libellés français des statuts
const STATUS_LABELS = {
  PENDING: 'En attente',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// Page admin : suivi des commandes + changement de statut
export default function OrdersAdmin() {
  const token = useAuthStore((state) => state.token);

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

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

  // Change le statut d'une commande puis met à jour la liste
  async function handleStatusChange(orderId, status) {
    setUpdatingId(orderId);
    setError(null);
    try {
      await updateOrderStatus(token, orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
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
        <select
          className="admin__filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Toutes les commandes</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </header>

      {error && <p className="auth__error">{error}</p>}
      {loading && <p className="home__message">Chargement des commandes...</p>}

      {!loading && orders.length === 0 && (
        <p className="home__message">Aucune commande ne correspond à ce filtre.</p>
      )}

      {!loading && orders.length > 0 && (
        <table className="admin__table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Client</th>
              <th>Date</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
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
                <td>{Number(order.total).toFixed(2)} €</td>
                <td>
                  <select
                    className={`admin__status admin__status--${order.status.toLowerCase()}`}
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={updatingId === order.id}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}