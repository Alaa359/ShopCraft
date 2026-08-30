import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { buildCart, CartError } from '../lib/cart.js';
import { getOrderByPaymentIntent, createOrderFromCart } from '../lib/orderService.js';
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

    // Idempotence : si le webhook a déjà créé la commande pour ce paiement,
    // on la renvoie telle quelle (sans re-décrémenter le stock).
    if (paymentIntentId) {
      const existing = await getOrderByPaymentIntent(paymentIntentId);
      if (existing) {
        const full = await prisma.order.findUnique({
          where: { id: existing.id },
          include: { items: true },
        });
        return res.status(201).json(full);
      }
    }

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

    // Crée la commande (transaction + décrémentation du stock)
    const order = await createOrderFromCart({
      userId: req.user.id,
      cart,
      paymentIntentId,
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