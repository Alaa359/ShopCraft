import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { buildCart, CartError } from '../lib/cart.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';

const router = Router();

// POST /api/orders
// Crée une commande pour l'utilisateur connecté (protégé).
// Body : { items: [{ productId, quantity }], paymentIntentId? }
// Si paymentIntentId est fourni, le serveur vérifie auprès de Stripe
// que le paiement a bien été confirmé avant de créer la commande.
router.post('/', auth, async (req, res, next) => {
  try {
    const { items, paymentIntentId } = req.body ?? {};

    // Reconstruit et valide le panier côté serveur
    let cart;
    try {
      cart = await buildCart(items);
    } catch (err) {
      if (err instanceof CartError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    // Vérification serveur du paiement (si Stripe est utilisé)
    if (paymentIntentId) {
      if (!stripeEnabled) {
        return res.status(400).json({ error: 'Stripe n’est pas configuré' });
      }
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const expectedAmount = Math.round(cart.total * 100);
      if (intent.status !== 'succeeded' || intent.amount !== expectedAmount) {
        return res.status(402).json({ error: 'Paiement non confirmé ou montant invalide' });
      }
    }

    // Crée la commande + lignes, et décrémente le stock dans une transaction
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          total: cart.total,
          items: {
            create: cart.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              price: line.price,
            })),
          },
        },
        include: { items: true },
      });

      for (const line of cart.lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }
      return created;
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/mine
// Historique des commandes de l'utilisateur connecté (protégé)
router.get('/mine', auth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

export default router;