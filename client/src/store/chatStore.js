// Store global du chat en direct (client <-> support).
//
// Gère :
//  - l'ouverture/fermeture du panneau flottant ;
//  - la connexion Socket.IO et l'écoute des événements temps réel ;
//  - la conversation active (room) et sa liste de messages ;
//  - pour l'admin, la liste des conversations en attente ;
//  - le compteur de messages non lus affiché sur le bouton flottant.
import { create } from 'zustand';
import { getSocket, closeSocket } from '../lib/socket.js';
import * as api from '../api/client.js';

let socket = null;

export const useChatStore = create((set, get) => ({
  open: false,
  connected: false,
  connecting: false,
  rooms: [], // admin : toutes les conversations ; client : la sienne
  activeRoom: null, // conversation actuellement affichée
  messages: [],
  unread: 0, // messages non lus pour la conversation affichée / reçus en arrière-plan
  activeRoomId: null, // room affichée (utile pour l'admin multi-conversations)
  loading: false,
  error: null,
  token: null,
  user: null,

  toggle: () => set((s) => ({ open: !s.open })),
  openChat: () => set({ open: true }),
  closeChat: () => set({ open: false }),

  // Connexion + chargement initial (depuis REST) quand l'utilisateur connecté change.
  init: async (token, user) => {
    if (!token || !user) {
      closeSocket();
      return set({ connected: false, rooms: [], activeRoom: null, activeRoomId: null, unread: 0, open: false, token: null, user: null });
    }
    if (socket) socket.disconnect();
    set({ token, user });
    socket = getSocket(token);
    set({ connecting: true });

    socket.on('connect', () => {
      set({ connected: true, connecting: false });
      get().openMyRoom(false);
    });
    socket.on('disconnect', () => set({ connected: false }));
    socket.on('connect_error', () => set({ connecting: false, connected: false }));

    // Si la connexion était déjà établie avant l'ajout des écouteurs (course),
    // on ouvre tout de même la conversation.
    if (socket.connected) get().openMyRoom(false);

    // Temps réel : nouveau message.
    socket.on('chat:new-message', (message) => {
      const s = get();
      const target = message.roomId;
      // Message affiché ? on l'ajoute à la liste.
      if (s.activeRoomId === target) {
        set((st) => ({
          messages: [...st.messages.filter((m) => m.id !== message.id), message],
        }));
      } else {
        // Sinon badge non lu (côté client c'est sa propre room).
        set((st) => ({ unread: st.unread + 1 }));
      }
      // Rafraîchit la liste des conversations de l'admin (statut/message).
      if (user.role === 'ADMIN') get().refreshRooms();
    });
    socket.on('chat:status', ({ status }) => {
      const s = get();
      if (s.activeRoom && s.activeRoom.status !== status) {
        set({ activeRoom: { ...s.activeRoom, status } });
      }
      get().refreshRooms();
    });

    // Chargement initial des conversations (REST) pour l'admin / le client.
    try {
      const rooms = await api.getChatRooms(token);
      set({ rooms });
      if (user.role !== 'ADMIN' && rooms.length) {
        set({ activeRoom: rooms[0], activeRoomId: rooms[0].id, messages: rooms[0].messages || [] });
      }
    } catch {
      /* silencieux */
    }
    set({ connecting: false });
  },

  // Ouvrir sa propre conversation (client) via Socket.IO (crée la room si besoin).
  openMyRoom: (emitUnread) => {
    const { user } = get();
    const t = socket;
    if (!t || !user) return;
    t.emit('chat:open', (res) => {
      if (res && res.room) {
        set({ activeRoom: res.room, activeRoomId: res.room.id, messages: res.messages || [] });
        if (emitUnread) set({ unread: 0 });
      }
    });
  },

  // L'admin sélectionne une conversation.
  openRoom: (roomId) => {
    if (!socket) return;
    const s = get();
    const room = s.rooms.find((r) => r.id === roomId) || s.activeRoom;
    if (!room) return;
    socket.emit('chat:join', roomId, (res) => {
      if (res && res.room) {
        set({ activeRoom: res.room, activeRoomId: roomId, messages: res.messages || [] });
        // Les messages de cette conversation ne sont plus à compter en non-lus.
        set((st) => ({ unread: Math.max(0, st.unread - s.messages.filter((m) => !m.seen && m.roomId === roomId).length) }));
      }
    });
  },

  // Rafraîchit la liste des conversations (admin).
  refreshRooms: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const rooms = await api.getChatRooms(token);
      set({ rooms });
    } catch {
      /* silencieux */
    }
  },

  sendMessage: (body) => {
    if (!socket) return;
    const roomId = get().activeRoomId;
    socket.emit('chat:message', { roomId, body }, () => {});
  },

  closeRoom: (roomId) => {
    if (!socket) return;
    socket.emit('chat:close', roomId, (res) => {
      if (res && res.ok) get().refreshRooms();
    });
  },

  reset: () => {
    closeSocket();
    socket = null;
    set({
      connected: false, rooms: [], activeRoom: null, activeRoomId: null,
      messages: [], unread: 0, open: false, loading: false, error: null,
      token: null, user: null,
    });
  },
}));
