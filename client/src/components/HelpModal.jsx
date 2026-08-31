import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useSupportStore } from '../store/notificationStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useUiStore } from '../store/uiStore.js';
import * as api from '../api/client.js';

// Modale "Aide" : l'utilisateur envoie un problème (commande, livraison...).
// Le message part dans la cloche de l'admin, qui pourra répondre.
export default function HelpModal() {
  const open = useSupportStore((state) => state.helpOpen);
  const close = useSupportStore((state) => state.closeHelp);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const refetch = useNotificationStore((state) => state.fetch);
  const showToast = useUiStore((state) => state.showToast);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;
  if (!token) {
    return (
      <div className="modal-overlay" onClick={close}>
        <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal__head">
            <h2 className="modal__title">Besoin d'aide ?</h2>
            <button type="button" className="modal__close" onClick={close} aria-label="Fermer">
              ✕
            </button>
          </div>
          <p className="modal__text">
            Connectez-vous pour envoyer votre problème : il sera traité par notre équipe.
          </p>
          <div className="modal__actions">
            <Link to="/login" className="btn btn--primary" onClick={close}>
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createTicket(token, { subject: subject.trim(), message: message.trim() });
      showToast('Votre problème a bien été envoyé à notre équipe.');
      refetch();
      close();
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">Besoin d'aide ?</h2>
          <button type="button" className="modal__close" onClick={close} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          <p className="modal__text">
            Un souci avec votre commande, une livraison, un produit ? Décrivez le problème, nous
            vous répondrons dans votre cloche de notifications.
          </p>

          {error && <p className="auth__error">{error}</p>}

          <label className="auth__label">
            Sujet
            <input
              type="text"
              className="auth__input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Commande jamais reçue"
              maxLength={120}
              required
            />
          </label>

          <label className="auth__label">
            Description du problème
            <textarea
              className="auth__input support-help__textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Expliquez-nous ce qui se passe..."
              maxLength={2000}
              rows={5}
              required
            />
          </label>

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={close}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer mon problème'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}