import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { getInitials } from '../lib/user.js';

// Mini-avatar : photo ou initiales
function Bubble({ author, size = 34 }) {
  const name = author?.displayName || author?.email?.split('@')[0] || '?';
  if (author?.avatar) {
    return <img className="chat-bubble__avatar" style={{ width: size, height: size }} src={author.avatar} alt={name} />;
  }
  return (
    <span className="chat-bubble__avatar chat-bubble__avatar--initial" style={{ width: size, height: size }}>
      {getInitials(author?.displayName, author?.email)}
    </span>
  );
}

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Composant flottant : bouton + panneau de conversation.
export default function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const chat = useChatStore();

  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';

  // Initialise / nettoie le chat quand l'utilisateur change.
  useEffect(() => {
    chat.init(token, user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  // Scroll vers le bas à chaque nouveau message / ouverture.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length, chat.activeRoomId, chat.open]);

  // Le widget n'apparaît que pour un utilisateur connecté.
  if (!user) return null;

  function submit(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    chat.sendMessage(body);
    setDraft('');
    inputRef.current?.focus();
  }

  const active = chat.activeRoom;
  const messages = chat.messages;

  return (
    <>
      {/* Bouton flottant */}
      <AnimatePresence>
        {chat.open && (
          <motion.div
            key="panel"
            className="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <div className="chat-panel__head">
              <div className="chat-panel__brand">
                <span className="chat-panel__logo" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 5h16v11H9l-5 3V5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="chat-panel__head-text">
                  <strong className="chat-panel__title">Support ShopCraft</strong>
                  <span className="chat-panel__status">
                    <span className={`chat-dot ${chat.connected ? 'is-on' : ''}`} />
                    {chat.connected ? 'En ligne' : 'Connexion...'}
                  </span>
                </div>
              </div>
              <button type="button" className="chat-panel__close" onClick={chat.closeChat} aria-label="Fermer le chat">
                ✕
              </button>
            </div>

            <div className="chat-panel__body">
              {/* Colonne conversation (client) ou liste (admin) */}
              {isAdmin && chat.rooms.length > 0 && (
                <div className="chat-rooms">
                  {chat.rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`chat-rooms__item ${chat.activeRoomId === r.id ? 'is-active' : ''}`}
                      onClick={() => chat.openRoom(r.id)}
                    >
                      <Bubble author={r.user} size={30} />
                      <span className="chat-rooms__info">
                        <span className="chat-rooms__name">{r.user?.displayName || r.user?.email}</span>
                        <span className="chat-rooms__status">
                          {r.status === 'OPEN' ? 'En attente' : r.status === 'ACTIVE' ? 'En cours' : 'Clôturée'}
                        </span>
                      </span>
                      <span className={`chat-rooms__dot ${r.status === 'OPEN' ? 'is-open' : ''}`} />
                    </button>
                  ))}
                </div>
              )}

              {isAdmin && chat.rooms.length === 0 && !chat.loading && (
                <div className="chat-empty">Aucune conversation en attente.</div>
              )}

              {/* Fil de messages */}
              {!isAdmin || (isAdmin && active) ? (
                <div className="chat-thread">
                  <div className="chat-thread__scroll">
                    {messages.length === 0 ? (
                      <div className="chat-thread__empty">
                        <p>Bonjour {user?.displayName?.split(' ')[0] || ''} 👋</p>
                        {isAdmin ? (
                          <p>Cette conversation n'a pas encore de message.</p>
                        ) : (
                          <p>
                            Posez-nous une question ou laissez-nous votre avis&nbsp;: un conseiller vous répond en direct.
                          </p>
                        )}
                      </div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.authorId === user.id;
                        return (
                          <div key={m.id} className={`chat-msg ${mine ? 'is-mine' : 'is-them'}`}>
                            {!mine && <Bubble author={m.author} size={30} />}
                            <div className="chat-msg__bubble">
                              <p className="chat-msg__body">{m.body}</p>
                              <span className="chat-msg__time">{fmt(m.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>
              ) : null}

              {/* Barre de saisie */}
              <form className="chat-composer" onSubmit={submit}>
                <input
                  ref={inputRef}
                  className="chat-composer__input"
                  placeholder="Écrivez votre message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className="chat-composer__send"
                  disabled={!draft.trim() || !chat.connected}
                  aria-label="Envoyer"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M4 11.5 20 4l-6 16-2.3-6.2L4 11.5z" fill="currentColor" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton flottant */}
      <motion.button
        className="chat-fab"
        onClick={chat.toggle}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        aria-label="Ouvrir le chat"
      >
        {chat.open ? (
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path
              d="M4 5h16v11H9l-5 3V5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {!chat.open && chat.unread > 0 && <span className="chat-fab__badge">{chat.unread}</span>}
      </motion.button>
    </>
  );
}
