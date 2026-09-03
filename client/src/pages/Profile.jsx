import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useUiStore } from '../store/uiStore.js';
import { updateMe, uploadAvatar } from '../api/client.js';
import { getInitials } from '../lib/user.js';
import { useT } from '../i18n.js';

// Page Profil : photo de profil (upload) + nom affiché + infos du compte,
// présentée en sections (personnelles / compte) pour éviter l'effet "page vide".
export default function Profile() {
  const { user, fetchMe, token } = useAuthStore();
  const showToast = useUiStore((state) => state.showToast);
  const { t } = useT();

  const fileRef = useRef(null);
  const [loading, setLoading] = useState(!user);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setName(user?.displayName?.trim() || user?.email?.split('@')[0] || '');
  }, [user?.id, user?.displayName]);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setBusy(true);
    try {
      const { url } = await uploadAvatar(token, file);
      await updateMe(token, { avatar: url });
      await fetchMe();
      showToast(t('saved'));
    } catch (err) {
      showToast(err.message || 'Erreur lors du changement de photo', 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!token) return;
    setBusy(true);
    try {
      await updateMe(token, { displayName: name });
      await fetchMe();
      showToast(t('saved'));
    } catch (err) {
      showToast(err.message || 'Erreur lors de l’enregistrement', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="home__message">{t('loadingProfile')}</p>;
  }

  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || '';
  const initial = getInitials(user?.displayName, user?.email);
  const isAdmin = user?.role === 'ADMIN';
  const roleLabel = isAdmin ? (t('roleAdmin') || 'Administrateur') : (t('roleUser') || 'Client');
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="profile">
      {/* En-tête : photo + nom + rôle */}
      <header className="profile__hero">
        <div className="profile__avatar-wrap">
          {user?.avatar ? (
            <img className="profile__avatar" src={user.avatar} alt={displayName} />
          ) : (
            <span className="profile__avatar profile__avatar--initial">{initial}</span>
          )}
          <button
            type="button"
            className="profile__photo-btn"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {t('changePhoto')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="profile__file"
            onChange={handlePhoto}
          />
        </div>

        <div className="profile__hero-text">
          <span className="profile__eyebrow">{t('profileTitle')}</span>
          <h1 className="profile__title">Bonjour, {displayName || '—'}</h1>
          <p className="profile__tagline">
            {isAdmin
              ? 'Vous gérez la boutique ShopCraft.'
              : 'Bienvenue dans votre espace personnel.'}
          </p>
          <div className="profile__badges">
            <span className={`profile__role profile__role--${isAdmin ? 'admin' : 'client'}`}>
              {roleLabel}
            </span>
            <span className="profile__since">Membre depuis {memberSince}</span>
          </div>
        </div>
      </header>

      <div className="profile__grid">
        {/* Informations personnelles (modifiables) */}
        <section className="profile__card">
          <h2 className="profile__card-title">Informations personnelles</h2>
          <p className="profile__card-hint">
            Votre nom tel qu'il apparaît sur vos commandes.
          </p>
          <div className="profile__fields">
            <label className="profile__field">
              <span className="profile__label">{t('displayName')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </label>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={busy || !name.trim()}
            >
              {busy ? 'Enregistrement...' : t('saveChanges')}
            </button>
          </div>
        </section>

        {/* Informations du compte (lecture seule) */}
        <section className="profile__card">
          <h2 className="profile__card-title">Informations du compte</h2>
          <dl className="profile__info">
            <div className="profile__row">
              <dt>Adresse e-mail</dt>
              <dd>{user?.email}</dd>
            </div>
            <div className="profile__row">
              <dt>{t('roleLabel')}</dt>
              <dd>{roleLabel}</dd>
            </div>
            <div className="profile__row">
              <dt>Membre depuis</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
