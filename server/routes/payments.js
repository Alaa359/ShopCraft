import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { tryBuildCart } from '../lib/cart.js';
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

    const cart = await tryBuildCart(items, res);
    if (!cart) return; // réponse 400 déjà envoyée (panier invalide)

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
      // Le panier et l'utilisateur sont stockés en metadata afin que le
      // webhook Stripe puisse recréer la commande si le paiement est
      // confirmé de manière asynchrone (3DS, moyen de paiement différé...).
      metadata: {
        userId: req.user.id,
        items: JSON.stringify(
          cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity }))
        ),
      },
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