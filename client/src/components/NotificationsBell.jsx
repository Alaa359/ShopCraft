import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Icône enveloppe / message (SVG inline)
function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// Contrôle de notifications réutilisable dans la barre du site (cloche) et le
// bandeau admin (enveloppe "messages") : même panneau, mêmes données.
export default function NotificationsBell({ variant = 'nav' }) {
  const isAdminVariant = variant === 'admin';

  const user = useAuthStore((state) => state.user);
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loading = useNotificationStore((state) => state.loading);
  const fetchNotifications = useNotificationStore((state) => state.fetch);
  const markRead = useNotificationStore((state) => state.markRead);
  const reset = useNotificationStore((state) => state.reset);
  const openThread = useSupportStore((state) => state.openThread);
  const openInbox = useSupportStore((state) => state.openInbox);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

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

  // Ferme le panneau au clic extérieur (bouton + panneau rendu en portal)
  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      const inBox = boxRef.current && boxRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inBox && !inPanel) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Ferme le panneau au défilement (il est positionné en fixed : on évite
  // qu'il reste « flottant » au mauvais endroit)
  useEffect(() => {
    if (!open) return undefined;
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // À l'ouverture : recharge + calcule la position du panneau sous le bouton.
  // Le panneau est ancré (fixed) au bouton, sans jamais déborder de l'écran.
  function handleToggle() {
    const next = !open;
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelW = Math.min(340, window.innerWidth - 16);
      let left = Math.round(rect.right - panelW);
      if (left < 8) left = 8;
      setPos({
        top: Math.round(rect.bottom + 10),
        left,
        width: panelW,
      });
    }
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

  function handleInbox() {
    setOpen(false);
    openInbox();
  }

  const containerClass = isAdminVariant ? 'admin-topbar__bell' : 'navbar__bell';
  const buttonClass = isAdminVariant ? 'admin-topbar__icon' : 'navbar__action';
  const badgeClass = isAdminVariant ? 'admin-topbar__badge' : 'navbar__badge';

  return (
    <div className={containerClass} ref={boxRef}>
      <button
        type="button"
        ref={btnRef}
        className={buttonClass}
        aria-label={isAdminVariant ? 'Messages et notifications' : 'Notifications'}
        aria-expanded={open}
        title={isAdminVariant ? 'Messages et notifications' : 'Notifications'}
        onClick={handleToggle}
      >
        {isAdminVariant ? <EnvelopeIcon /> : <BellIcon />}
        {unreadCount > 0 && (
          <span key={unreadCount} className={badgeClass}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            className="support-bell"
            ref={panelRef}
            style={{
              position: 'fixed',
              top: (pos?.top ?? 56),
              left: (pos?.left ?? 0),
              width: (pos?.width ?? 340),
            }}
          >
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
                <Link
                  to="/login"
                  className="btn btn--primary btn--small"
                  onClick={() => setOpen(false)}
                >
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

            {user?.role === 'ADMIN' && (
              <div className="support-bell__footer">
                <button type="button" className="support-bell__inbox" onClick={handleInbox}>
                  Boîte des demandes (admin)
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}