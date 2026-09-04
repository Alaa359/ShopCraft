// Serveur de chat en temps réel (Socket.IO).
//
// Principe :
//  - Chaque client connecté possède une conversation (ChatRoom) unique.
//  - Les participants (client + administrateurs) se rejoignent une "room"
//    Socket.IO nommée `chat:room:<roomId>` pour recevoir les messages en direct.
//  - Un message reçu est TOUJOURS persisté en base AVANT d'être rediffusé aux
//    autres participants, afin que l'historique et le temps réel restent alignés.
//
// Authentification : un token JWT est passé via handshake.auth.token (même
// logique que le middleware Express auth.js).
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { getSystemBot, autoReply } from './bot.js';

const SELECT_AUTHOR = { select: { id: true, email: true, displayName: true, avatar: true, role: true } };

// Récupère (et crée si besoin) la conversation du client connecté.
async function getOrCreateRoom(userId, role) {
  // Les admins ne possèdent pas de "room personnelle" ; ils rejoignent celle des clients.
  if (role === 'ADMIN') {
    return prisma.chatRoom.findFirst({ where: { userId } });
  }
  const existing = await prisma.chatRoom.findFirst({ where: { userId } });
  if (existing) return existing;
  // Supprime les anciennes conversations fermées pour n'en garder qu'une active.
  await prisma.chatRoom.deleteMany({ where: { userId, status: 'CLOSED' } });
  return prisma.chatRoom.create({
    data: { userId, status: 'OPEN' },
    include: { user: SELECT_AUTHOR },
  });
}

// Piece d'émission : crée une conversation pour le client si besoin, sinon
// renvoie null (admin sans conversation).
async function roomIdFor(socketUser) {
  const room = await getOrCreateRoom(socketUser.id, socketUser.role);
  return room ? `chat:room:${room.id}` : null;
}

function notifyAdmins(io, title, body) {
  io.emit('chat:notify-admin', { title, body });
}

export function initChat(io) {
  // Auth Socket.IO : vérifie le JWT handshake et charge l'utilisateur.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Non authentifié'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, displayName: true, avatar: true, role: true },
      });
      if (!user) return next(new Error('Compte introuvable'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error(err.message || 'Authentification invalide'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    const isAdmin = user.role === 'ADMIN';

    // Le client ouvre son chat : il rejoint sa room et reçoit son historique.
    socket.on('chat:open', async (cb) => {
      try {
        const room = await getOrCreateRoom(user.id, user.role);
        if (!room) return cb && cb({ error: 'Aucune conversation' });
        socket.join(`chat:room:${room.id}`);
        const messages = await prisma.chatMessage.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: 'asc' },
          include: { author: SELECT_AUTHOR },
        });
        cb && cb({ room, messages });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    });

    // L'admin ouvre une conversation existante (liste fournie par l'API REST).
    socket.on('chat:join', async (roomId, cb) => {
      try {
        if (!isAdmin) return cb && cb({ error: 'Accès refusé' });
        const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room) return cb && cb({ error: 'Conversation introuvable' });
        socket.join(`chat:room:${room.id}`);
        // L'admin prend le statut de la conversation en charge.
        await prisma.chatRoom.update({ where: { id: room.id }, data: { status: 'ACTIVE' } });
        const messages = await prisma.chatMessage.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: 'asc' },
          include: { author: SELECT_AUTHOR },
        });
        cb && cb({ room, messages });
        io.to(`chat:room:${room.id}`).emit('chat:status', { status: 'ACTIVE' });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    });

    // Envoi d'un message : persisté en base puis rediffusé à la room.
    socket.on('chat:message', async (data, cb) => {
      try {
        const body = String(data?.body ?? '').trim().slice(0, 2000);
        if (!body) return cb && cb({ error: 'Message vide' });
        // L'admin cible une room ; le client utilise automatiquement la sienne.
        let roomId = String(data?.roomId ?? '');
        if (!roomId) {
          const own = await getOrCreateRoom(user.id, user.role);
          if (!own) return cb && cb({ error: 'Aucune conversation' });
          roomId = own.id;
        }
        const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room) return cb && cb({ error: 'Conversation introuvable' });
        // Accès : admin partout, client uniquement sur sa propre conversation.
        if (!isAdmin && room.userId !== user.id) {
          return cb && cb({ error: 'Accès refusé' });
        }
        if (room.status === 'CLOSED') {
          return cb && cb({ error: 'Cette conversation est clôturée' });
        }

        const message = await prisma.chatMessage.create({
          data: { roomId: room.id, authorId: user.id, body },
          include: { author: SELECT_AUTHOR },
        });
        const nextStatus = isAdmin ? 'ACTIVE' : room.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
        await prisma.chatRoom.update({ where: { id: room.id }, data: { status: nextStatus } });

        socket.join(`chat:room:${room.id}`);
        io.to(`chat:room:${room.id}`).emit('chat:new-message', message);

        // Notifie le connecté concerné en temps réel (client ou admins).
        if (isAdmin) {
          io.to(`chat:room:${room.id}`).emit('chat:notify-client', {
            title: 'Nouveau message du support',
            body: message.body.slice(0, 120),
          });
        } else {
          notifyAdmins(io, 'Nouveau message client', `${user.email} : ${message.body.slice(0, 120)}`);
          // Si aucun admin n'est engagé, le bot répond automatiquement.
          autoReply(io, socket, room.id);
        }
        cb && cb({ message });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    });

    // Clôture d'une conversation par un admin.
    socket.on('chat:close', async (roomId, cb) => {
      try {
        if (!isAdmin) return cb && cb({ error: 'Accès refusé' });
        await prisma.chatRoom.update({ where: { id: roomId }, data: { status: 'CLOSED' } });
        io.to(`chat:room:${roomId}`).emit('chat:status', { status: 'CLOSED' });
        cb && cb({ ok: true });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}
