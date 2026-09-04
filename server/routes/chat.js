// Routes REST du chat (support en direct).
//
// Sert d'historique au chargement et de listing des conversations pour les
// administrateurs. Le temps réel est géré par Socket.IO (server/chat/socket.js)
// ; ces routes REST restent cohérentes avec le reste de l'application.
//
// Mobile :
//  - GET  /api/chat/rooms           : conversations (admins) ou la mienne (client)
//  - GET  /api/chat/rooms/:id/messages : historique d'une conversation
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = Router();

const SELECT_USER = {
  select: { id: true, email: true, displayName: true, avatar: true },
};

// GET /api/chat/rooms
// Client : renvoie sa conversation (avec un historique éventuellement vide).
// Admin  : renvoie toutes les conversations ouvertes/actives.
router.get('/rooms', auth, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      const rooms = await prisma.chatRoom.findMany({
        where: { status: { in: ['OPEN', 'ACTIVE'] } },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: SELECT_USER,
          messages: { orderBy: { createdAt: 'asc' }, include: { author: SELECT_USER } },
        },
      });
      return res.json(rooms);
    }
    const room = await prisma.chatRoom.findFirst({
      where: { userId: req.user.id },
      include: {
        user: SELECT_USER,
        messages: { orderBy: { createdAt: 'asc' }, include: { author: SELECT_USER } },
      },
    });
    res.json(room ? [room] : []);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/rooms/:id/messages
// Historique complet d'une conversation (client propriétaire ou admin).
router.get('/rooms/:id/messages', auth, async (req, res, next) => {
  try {
    const room = await prisma.chatRoom.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ error: 'Conversation introuvable' });
    if (room.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
      include: { author: SELECT_USER },
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

export default router;
