import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products.js';
import authRouter from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import uploadsRouter from './routes/uploads.js';
import statsRouter from './routes/stats.js';
import reviewsRouter from './routes/reviews.js';
import supportRouter from './routes/support.js';
import { stripe, stripeEnabled, stripeWebhookSecret } from './lib/stripe.js';
import { buildCart, CartError } from './lib/cart.js';
import { createOrderFromCart, getOrderByPaymentIntent } from './lib/orderService.js';
import { UPLOADS_DIR } from './lib/upload.js';

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

// Images uploadées (v1) : servies statiquement depuis /server/uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Route de vérification de l'API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes métiers
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin/stats', statsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/upload', uploadsRouter);
app.use('/api/support', supportRouter);

// 404 pour toute route inconnue
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Gestion centralisée des erreurs
app.use((err, req, res, next) => {
  // Corps JSON malformé (body-parser) -> 400
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide' });
  }

  // Certaines erreurs portent déjà un code HTTP explicite (body-parser, multer...)
  const status = err.statusCode || err.status || 500;

  // En 500, on logge la cause ; le message détaillé n'est renvoyé qu'en dev
  if (status >= 500) {
    console.error(err);
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Erreur serveur interne'
        : err.message || 'Erreur serveur interne';
    return res.status(500).json({ error: message });
  }

  res.status(status).json({ error: err.message || 'Requête invalide' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API ShopCraft démarrée sur http://localhost:${PORT}`);
});