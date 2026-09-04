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

// ---- Sous-composants (vue admin / client) ----

// Fil de messages partagé (client ou admin).
function Thread({ chat, user, emptyHint, bottomRef }) {
  return (
    <div className="chat-thread">
      <div className="chat-thread__scroll">
        {chat.messages.length === 0 ? (
          <div className="chat-thread__empty">{emptyHint}</div>
        ) : (
          chat.messages.map((m) => {
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
  );
}

// Barre de saisie.
function Composer({ chat, draft, setDraft, submit, inputRef, placeholder }) {
  return (
    <form className="chat-composer" onSubmit={submit}>
      <input
        ref={inputRef}
        className="chat-composer__input"
        placeholder={placeholder || 'Écrivez votre message...'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={!chat.activeRoom}
      />
      <button
        type="submit"
        className="chat-composer__send"
        disabled={!draft.trim() || !chat.connected || !chat.activeRoom}
        aria-label="Envoyer"
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 11.5 20 4l-6 16-2.3-6.2L4 11.5z" fill="currentColor" />
        </svg>
      </button>
    </form>
  );
}

// Vue client : juste le fil + la barre de saisie de sa propre conversation.
function ClientConversation({ chat, user, draft, setDraft, submit, inputRef, bottomRef }) {
  return (
    <>
      <Thread
        chat={chat}
        user={user}
        bottomRef={bottomRef}
        emptyHint={
          <>
            <p>Bonjour {user?.displayName?.split(' ')[0] || ''} 👋</p>
            <p>
              Posez-nous une question ou laissez-nous votre avis&nbsp;: un conseiller vous répond en direct.
            </p>
          </>
        }
      />
      <Composer chat={chat} draft={draft} setDraft={setDraft} submit={submit} inputRef={inputRef} />
    </>
  );
}

// Liste admin des clients qui ont écrit (cliquer ouvre la conversation).
function AdminRoomList({ chat }) {
  if (chat.rooms.length === 0 && !chat.loading) {
    return <div className="chat-empty">Aucune conversation client pour le moment.</div>;
  }
  return (
    <div className="chat-rooms chat-rooms--full">
      <div className="chat-rooms__head">Clients</div>
      {chat.rooms.map((r) => (
        <button
          key={r.id}
          type="button"
          className="chat-rooms__item"
          onClick={() => chat.openRoom(r.id)}
        >
          <Bubble author={r.user} size={34} />
          <span className="chat-rooms__info">
            <span className="chat-rooms__name">{r.user?.displayName || r.user?.email}</span>
            <span className="chat-rooms__status">
              {r.status === 'OPEN' ? 'En attente' : r.status === 'ACTIVE' ? 'En cours' : 'Clôturée'}
              {r.messages?.length ? ` · ${r.messages.length} msg` : ''}
            </span>
          </span>
          <span className={`chat-rooms__dot ${r.status === 'OPEN' ? 'is-open' : ''}`} />
        </button>
      ))}
    </div>
  );
}

// Conversation ouverte par l'admin : retour à la liste + fil + designer + suppression.
function AdminConversation({ chat, user, onSend, draft, setDraft, inputRef, bottomRef }) {
  const [confirm, setConfirm] = useState(false);
  const room = chat.activeRoom;

  function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setConfirm(false);
    chat.deleteRoom(room.id);
  }

  return (
    <>
      <div className="chat-conv__bar">
        <button type="button" className="chat-conv__back" onClick={chat.backToList}>
          ← Retour
        </button>
        <div className="chat-conv__who">
          <Bubble author={room?.user} size={28} />
          <span className="chat-conv__who-name">{room?.user?.displayName || room?.user?.email || 'Client'}</span>
        </div>
        <button
          type="button"
          className={`chat-conv__delete ${confirm ? 'is-confirm' : ''}`}
          onClick={handleDelete}
          disabled={chat.deleting}
          aria-label="Supprimer la conversation"
        >
          {chat.deleting ? '…' : confirm ? 'Confirmer ?' : '🗑'}
        </button>
      </div>
      <Thread
        chat={chat}
        user={user}
        bottomRef={bottomRef}
        emptyHint={<p>Cette conversation n'a pas encore de message.</p>}
      />
      <Composer chat={chat} draft={draft} setDraft={setDraft} submit={onSend} inputRef={inputRef} />
    </>
  );
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
              {/* ---------- VUE ADMIN ---------- */}
              {isAdmin ? (
                chat.adminView === 'list' ? (
                  <AdminRoomList chat={chat} user={user} />
                ) : (
                  <AdminConversation
                    chat={chat}
                    user={user}
                    onSend={submit}
                    draft={draft}
                    setDraft={setDraft}
                    inputRef={inputRef}
                    bottomRef={bottomRef}
                  />
                )
              ) : (
                <ClientConversation
                  chat={chat}
                  user={user}
                  draft={draft}
                  setDraft={setDraft}
                  submit={submit}
                  inputRef={inputRef}
                  bottomRef={bottomRef}
                />
              )}
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
