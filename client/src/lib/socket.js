// Client Socket.IO partagé (chat en direct).
// En développement, le serveur Socket.IO tourne sur le port du backend (5000),
// sur la même origine en production. On expose une petite API de connexion
// paramétrée par le token courant afin de reconnecter proprement à la connexion.
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// Renvoie le socket connecté avec le token fourni (reconnecte si besoin).
export function getSocket(token) {
  const needInit = !socket || socket.disconnected;
  if (socket && socket.auth?.token !== token) {
    socket.disconnect();
    socket = null;
    return getSocket(token);
  }
  if (!token) return null;
  if (needInit) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
}

// Déconnecte et libère le socket (ex. à la déconnexion utilisateur).
export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
