import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products.js';
import authRouter from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import { stripe, stripeEnabled, stripeWebhookSecret } from './lib/stripe.js';
import { buildCart, CartError } from './lib/cart.js';
import { createOrderFromCart, getOrderByPaymentIntent } from './lib/orderService.js';

dotenv.config();

const app = express();

// Middlewares globaux
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// IMPORTANT : le webhook Stripe doit recevoir le corps brut (Buffer) pour
// vérifier la signature. Il est donc monté AVANT express.json().
app.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!stripeEnabled || !sig || !stripeWebhookSecret) {
      return res.status(400).send(
        'Webhook Stripe non configuré. Lancez `stripe listen --forward-to ' +
          `http://localhost:${process.env.PORT || 5000}/webhook/stripe\` et ajoutez ` +
          'STRIPE_WEBHOOK_SECRET dans server/.env.'
      );
    }

    // Vérifie la signature de l'événement reçu
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
      console.error('Signature webhook invalide :', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Confirmation de paiement : crée la commande si elle n'existe pas déjà
    // (cas des paiements asynchrones / 3DS où le client ne revient pas sur la page).
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const userId = intent.metadata?.userId;
      const itemsRaw = intent.metadata?.items;

      try {
        if (!userId || !itemsRaw) {
          console.warn('Webhook : payment_intent.succeeded sans panier stocké');
          return res.json({ received: true });
        }
        // Idempotence : ignoré si la commande a déjà été créée (réponse synchrone)
        const existing = await getOrderByPaymentIntent(intent.id);
        if (existing) {
          return res.json({ received: true, order: existing.id });
        }
        const items = JSON.parse(itemsRaw);
        const cart = await buildCart(items);
        const order = await createOrderFromCart({ userId, cart, paymentIntentId: intent.id });
        console.log(`Webhook : commande ${order.id} créée pour le paiement ${intent.id}`);
      } catch (err) {
        if (err instanceof CartError || err instanceof SyntaxError) {
          console.error('Webhook : panier invalide pour le paiement', intent.id, err.message);
        } else {
          console.error('Webhook : échec création commande', err.message);
        }
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());

// Route de vérification de l'API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes métiers
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);

// 404 pour toute route inconnue
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Gestion centralisée des erreurs
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API ShopCraft démarrée sur http://localhost:${PORT}`);
});