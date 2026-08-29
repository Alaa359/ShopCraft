import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { buildCart, CartError } from '../lib/cart.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';

const router = Router();

// POST /api/payments/create-intent
// Prépare le paiement pour un panier (protégé).
// - Avec clés Stripe : crée un PaymentIntent et renvoie son client_secret.
// - Sans clés : "mode simulé" (clientSecret null) pour tester sans payer.
// Le montant est toujours recalculé côté serveur.
router.post('/create-intent', auth, async (req, res, next) => {
  try {
    const { items } = req.body ?? {};

    let cart;
    try {
      cart = await buildCart(items);
    } catch (err) {
      if (err instanceof CartError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    if (!stripeEnabled) {
      return res.json({
        clientSecret: null,
        publicKey: null,
        mode: 'simulated',
        total: cart.total,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(cart.total * 100),
      currency: 'eur',
      metadata: { userId: req.user.id },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      publicKey: process.env.STRIPE_PUBLIC_KEY || null,
      mode: 'stripe',
      total: cart.total,
    });
  } catch (err) {
    next(err);
  }
});

export default router;