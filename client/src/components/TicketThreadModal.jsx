import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore, useSupportStore } from '../store/notificationStore.js';
import { useUiStore } from '../store/uiStore.js';
import * as api from '../api/client.js';

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// Fil de discussion d'un ticket : messages + zone de réponse.
// Ouvert via la cloche (utilisateur ou admin).
export default function TicketThreadModal() {
  const ticketId = useSupportStore((state) => state.threadTicketId);
  const closeThread = useSupportStore((state) => state.closeThread);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refetchNotifications = useNotificationStore((state) => state.fetch);
  const showToast = useUiStore((state) => state.showToast);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ticketId || !token) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getTicket(token, ticketId)
      .then((data) => {
        if (!alive) return;
        setTicket(data);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [ticketId, token]);

  if (!ticketId) return null;

  function handleSend(e) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    api
      .replyTicket(token, ticketId, reply.trim())
      .then(() => {
        setReply('');
        // Recharge le ticket (statut mis à jour par le serveur) + la cloche
        return api.getTicket(token, ticketId).then((data) => setTicket(data));
      })
      .then(() => {
        refetchNotifications();
        showToast('Réponse envoyée.');
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false));
  }

  return (
    <div className="modal-overlay" onClick={closeThread}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div className="support-thread__head">
            <h2 className="modal__title">{ticket?.subject ?? 'Ticket'}</h2>
            {ticket && (
              <span className={`support-ticket__status support-ticket__status--${ticket.status.toLowerCase()}`}>
                {ticket.status === 'OPEN' ? 'En cours' : 'Répondu'}
              </span>
            )}
          </div>
          <button type="button" className="modal__close" onClick={closeThread} aria-label="Fermer">
            ✕
          </button>
        </div>

        {error && <p className="auth__error">{error}</p>}
        {loading && !ticket && <p className="modal__text">Chargement...</p>}

        {ticket && (
          <>
            <div className="support-thread__list">
              {ticket.messages.map((m) => {
                const mine = m.authorId === user?.id;
                return (
                  <div key={m.id} className={`support-thread__msg ${mine ? 'is-mine' : ''}`}>
                    <div className="support-thread__meta">
                      {mine ? 'Vous' : m.author.email}
                      <span className="support-thread__time">{formatDate(m.createdAt)}</span>
                    </div>
                    <div className="support-thread__bubble">{m.body}</div>
                  </div>
                );
              })}
            </div>

            <form className="support-thread__reply" onSubmit={handleSend}>
              <textarea
                className="auth__input support-help__textarea"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Écrire une réponse..."
                maxLength={2000}
                required
              />
              <button type="submit" className="btn btn--primary btn--small" disabled={sending}>
                {sending ? 'Envoi...' : 'Répondre'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}