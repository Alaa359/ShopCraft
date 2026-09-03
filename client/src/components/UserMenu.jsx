import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getInitials } from '../lib/user.js';
import { useT } from '../i18n.js';

// Menu utilisateur : cercle avatar / initiale dans la barre du site.
// Au clic, un menu déroulant propose : Mon profil, Mon compte, Paramètres, déconnexion.
export default function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { t } = useT();

  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Ferme au clic extérieur ou avec Échap
  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Compte';
  const initial = getInitials(user?.displayName, user?.email);

  return (
    <div className="user-menu" ref={boxRef}>
      <button
        type="button"
        className="navbar__action user-menu__btn"
        aria-label={t('account')}
        title={t('account')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {user?.avatar ? (
          <img className="user-menu__avatar" src={user.avatar} alt="" />
        ) : (
          <span className="user-menu__initial">{initial}</span>
        )}
      </button>

      {open && (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__head">
            <span className="user-menu__name">{displayName}</span>
            <span className="user-menu__role">
              {user?.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
            </span>
          </div>

          <Link className="user-menu__item" to="/profile" role="menuitem" onClick={close}>
            {t('profile')}
          </Link>
          <Link className="user-menu__item" to="/account" role="menuitem" onClick={close}>
            {t('account')}
          </Link>
          <Link className="user-menu__item" to="/settings" role="menuitem" onClick={close}>
            {t('settings')}
          </Link>

          <div className="user-menu__sep" />

          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={handleLogout}
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}