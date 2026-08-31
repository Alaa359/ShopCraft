import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useSupportStore } from '../store/notificationStore.js';
import * as api from '../api/client.js';

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// Boîte de réception des demandes d'aide, réservée aux administrateurs.
// Ouverte via le bouton "Aide" du bandeau admin. Un clic ouvre le fil du ticket.
export default function SupportAdminModal() {
  const open = useSupportStore((state) => state.inboxOpen);
  const close = useSupportStore((state) => state.closeInbox);
  const openThread = useSupportStore((state) => state.openThread);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setTickets(await api.getAllTickets(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;
  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">Demandes d'aide reçues</h2>
          <button type="button" className="modal__close" onClick={close} aria-label="Fermer">
            ✕
          </button>
        </div>

        {error && <p className="auth__error">{error}</p>}
        {loading && tickets.length === 0 && <p className="modal__text">Chargement...</p>}
        {!loading && tickets.length === 0 && (
          <div className="support-inbox__empty">Aucune demande pour le moment.</div>
        )}

        {tickets.length > 0 && (
          <ul className="support-inbox__list">
            {tickets.map((t) => (
              <li key={t.id}>
                <button type="button" className="support-inbox__item" onClick={() => openThread(t.id)}>
                  <span className="support-inbox__main">
                    <span className="support-inbox__subject">{t.subject}</span>
                    <span className="support-inbox__meta">
                      {t.user.email} · {formatDate(t.createdAt)}
                    </span>
                  </span>
                  <span
                    className={`support-ticket__status support-ticket__status--${t.status.toLowerCase()}`}
                  >
                    {t.status === 'OPEN' ? 'En cours' : 'Répondu'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}