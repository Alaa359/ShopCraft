import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useUiStore } from '../store/uiStore.js';
import { updateMe, uploadAvatar } from '../api/client.js';
import { useT } from '../i18n.js';

// Page Profil : photo de profil (upload) + nom affiché éditable + infos du compte.
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
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

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

  const initial = (user?.displayName?.trim() || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="profile">
      <h1 className="profile__title">{t('profileTitle')}</h1>

      <div className="profile__card">
        {/* En-tête avec la photo de profil */}
        <div className="profile__head">
          <div className="profile__avatar-wrap">
            {user?.avatar ? (
              <img className="profile__avatar" src={user.avatar} alt={t('profileTitle')} />
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
        </div>

        {/* Champs éditables */}
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
            {t('saveChanges')}
          </button>
        </div>

        {/* Informations du compte (lecture seule) */}
        <dl className="profile__info">
          <div className="profile__row">
            <dt>{t('emailLabel')}</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="profile__row">
            <dt>{t('roleLabel')}</dt>
            <dd>{user?.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}</dd>
          </div>
          <div className="profile__row">
            <dt>{t('memberSince')}</dt>
            <dd>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('fr-FR')
                : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}