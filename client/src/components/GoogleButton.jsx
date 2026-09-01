import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../lib/google.js';

// Charge dynamiquement le SDK Google Identity Services (GIS).
function loadGis() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      return resolve(window.google);
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

// Bouton "Continuer avec Google", toujours visible pour les clients.
// - Si GOOGLE_CLIENT_ID est configuré : rend le vrai bouton officiel Google
//   et appelle onSuccess(idToken) après authentification.
// - Sinon : affiche un bouton visuellement identique mais désactivé, avec un
//   message indiquant que la connexion Google n'est pas encore configurée.
export default function GoogleButton({ onSuccess }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    loadGis().then((google) => {
      if (cancelled || !google) return;
      const handleCredential = (response) => {
        if (response?.credential) {
          onSuccessRef.current(response.credential);
        }
      };

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      });

      // Rend le bouton dans le conteneur (une seule fois)
      if (buttonRef.current && !ready) {
        google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: '100%',
        });
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [GOOGLE_CLIENT_ID]);

  // Client ID configuré : bouton Google officiel
  if (GOOGLE_CLIENT_ID) {
    return (
      <div className="google-btn">
        {!ready && <div className="google-btn__loading">Chargement de Google…</div>}
        <div ref={buttonRef} className="google-btn__container" />
      </div>
    );
  }

  // Client ID non configuré : bouton visible mais indisponible
  return (
    <div className="google-btn">
      <button
        type="button"
        className="google-btn__mock"
        onClick={() => setNote(true)}
        disabled={false}
      >
        <span className="google-btn__g" aria-hidden="true">G</span>
        Continuer avec Google
      </button>
      {note && (
        <p className="google-btn__note">
          La connexion Google est désactivée pour le moment. Configurez{' '}
          <code>VITE_GOOGLE_CLIENT_ID</code> (client) et <code>GOOGLE_CLIENT_ID</code>{' '}
          (serveur).
        </p>
      )}
    </div>
  );
}
