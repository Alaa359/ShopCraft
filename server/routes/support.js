// Tickets d'aide (Support) + Notifications (cloche)
//
// Flux :
//  - L'utilisateur envoie un problème -> ticket créé + notification aux admins.
//  - L'admin répond -> notification à l'utilisateur.
//  - L'utilisateur relance -> notification aux admins (le ticket repasse OPEN).
//
// Mobile : POST /api/support/tickets, GET /api/support/tickets/mine,
//          GET /api/support/tickets, POST /api/support/tickets/:id/reply,
//          GET /api/support/tickets/:id, GET /api/support/notifications,
//          PUT /api/support/notifications/read
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = Router();

const SELECT_USER = { select: { id: true, email: true } };

// Lutte contre le spam des tickets : message pré-défini en cas de body invalide
const MAX_SUBJECT = 120;
const MAX_BODY = 2000;

function parseSubject(subject) {
  const text = String(subject ?? '').trim();
  return text && text.length <= MAX_SUBJECT ? text : null;
}

function parseBody(body) {
  const text = String(body ?? '').trim();
  return text && text.length <= MAX_BODY ? text : null;
}

// Crée une notification TICKET_REPLY pour l'utilisateur, ou NEW_TICKET pour
// tous les administrateurs. Renvoie le nombre de notifications créées.
async function notifyTicket(ticket, message, isAdminMessage) {
  if (isAdminMessage) {
    // L'admin répond -> notification à l'utilisateur propriétaire
    return prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'TICKET_REPLY',
        title: 'Réponse à votre demande',
        body: `${message.author.email} a répondu : ${message.body.slice(0, 120)}`,
        ticketId: ticket.id,
      },
    });
  }
  // L'utilisateur envoie/relance -> notification à tous les admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  return prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: 'NEW_TICKET',
      title: ticket.messages.length === 0 ? 'Nouvelle demande d\'aide' : 'Réponse dans un ticket',
      body: `${message.author.email} : ${message.body.slice(0, 120)}`,
      ticketId: ticket.id,
    })),
  });
}

// POST /api/support/tickets
// L'utilisateur (connecté) envoie un problème. Body : { subject, message }
router.post('/tickets', auth, async (req, res, next) => {
  try {
    const subject = parseSubject(req.body?.subject);
    const message = parseBody(req.body?.message);
    if (!subject) {
      return res.status(400).json({ error: 'Un sujet (max 120 caractères) est requis' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Une description du problème est requise' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        messages: { create: { authorId: req.user.id, body: message } },
      },
      include: { messages: { include: { author: SELECT_USER } } },
    });

    await notifyTicket(ticket, ticket.messages[0], false);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// GET /api/support/tickets/mine
// Tous les tickets de l'utilisateur connecté (avec fil de messages).
router.get('/tickets/mine', auth, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { author: SELECT_USER } } },
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /api/support/tickets
// Tous les tickets, réservé aux administrateurs.
router.get('/tickets', auth, isAdmin, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: SELECT_USER,
        messages: { orderBy: { createdAt: 'asc' }, include: { author: SELECT_USER } },
      },
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /api/support/tickets/:id
// Détail d'un ticket (propriétaire ou admin).
router.get('/tickets/:id', auth, async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { author: SELECT_USER } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
    if (ticket.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /api/support/tickets/:id/reply
// Ajoute un message au ticket. L'utilisateur propriétaire comme l'admin peuvent
// répondre ; l'expéditeur reçoit une notification dans sa cloche côté admin.
// Body : { message }
router.post('/tickets/:id/reply', auth, async (req, res, next) => {
  try {
    const body = parseBody(req.body?.message);
    if (!body) {
      return res.status(400).json({ error: 'Un message est requis' });
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
    if (ticket.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const author = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true } });
    const message = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: req.user.id, body },
      include: { author: SELECT_USER },
    });

    // Un ticket auquel l'admin vient de répondre est considéré ANSWERED ;
    // une relance utilisateur le repasse OPEN.
    const isAdminMessage = req.user.role === 'ADMIN';
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: isAdminMessage ? 'ANSWERED' : 'OPEN' },
    });

    await notifyTicket(ticket, message, isAdminMessage);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

// GET /api/support/notifications
// Notifications de l'utilisateur connecté, non lues en premier.
router.get('/notifications', auth, async (req, res, next) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });
    const items = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: { ticket: { select: { id: true, subject: true } } },
    });
    res.json({ items, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/support/notifications/read
// Marque toutes les notifications comme lues (ou une seule si body : { id }).
router.put('/notifications/read', auth, async (req, res, next) => {
  try {
    const id = req.body?.id;
    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: req.user.id, read: false },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, read: false },
        data: { read: true },
      });
    }
    res.json({ message: 'Notifications lues' });
  } catch (err) {
    next(err);
  }
});

export default router;