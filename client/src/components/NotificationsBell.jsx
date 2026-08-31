import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore, useSupportStore } from '../store/notificationStore.js';

// Icône cloche (SVG inline)
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 17v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// Cloche de notifications : visible sur toutes les pages, dans la barre du site.
// Affiche les demandes d'aide (côté admin) et les réponses (côté utilisateur).
export default function NotificationsBell() {
  const user = useAuthStore((state) => state.user);
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loading = useNotificationStore((state) => state.loading);
  const fetchNotifications = useNotificationStore((state) => state.fetch);
  const markRead = useNotificationStore((state) => state.markRead);
  const reset = useNotificationStore((state) => state.reset);
  const openThread = useSupportStore((state) => state.openThread);

  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Rafraîchit les notifications au changement d'utilisateur, puis toutes les 30 s
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      reset();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(timer);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ferme le panneau au clic extérieur
  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // À l'ouverture : recharge (le badge peut avoir besoin d'une mise à jour)
  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && user) fetchNotifications();
  }

  function handleItemClick(item) {
    if (!item.read) markRead(item.id);
    if (item.ticketId) {
      setOpen(false);
      openThread(item.ticketId);
    }
  }

  function handleMarkAll() {
    markRead();
  }

  return (
    <div className="navbar__bell" ref={boxRef}>
      <button
        type="button"
        className="navbar__action"
        aria-label="Notifications"
        aria-expanded={open}
        title="Notifications"
        onClick={handleToggle}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span key={unreadCount} className="navbar__badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="support-bell">
          <div className="support-bell__head">
            <span className="support-bell__title">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="support-bell__markall" onClick={handleMarkAll}>
                Tout marquer lu
              </button>
            )}
          </div>

          {!user ? (
            <div className="support-bell__empty">
              <p>Connectez-vous pour voir vos notifications.</p>
              <Link to="/login" className="btn btn--primary btn--small" onClick={() => setOpen(false)}>
                Connexion
              </Link>
            </div>
          ) : loading && items.length === 0 ? (
            <div className="support-bell__empty">
              <p>Chargement...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="support-bell__empty">
              <p>Aucune notification pour le moment.</p>
            </div>
          ) : (
            <ul className="support-bell__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`support-bell__item ${item.read ? '' : 'is-unread'}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="support-bell__dot" aria-hidden="true" />
                    <span className="support-bell__body">
                      <span className="support-bell__title--item">{item.title}</span>
                      <span className="support-bell__text">{item.body}</span>
                      <span className="support-bell__time">{formatDate(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}