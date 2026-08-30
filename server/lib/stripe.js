import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Client Stripe créé uniquement si la clé secrète de test est configurée.
// Sans clé, l'application fonctionne en "mode simulé" (voir routes/payments.js).
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeEnabled = Boolean(stripe);

// Secret du webhook Stripe (récupéré via `stripe listen` en mode test).
// Sert à vérifier la signature des événements reçus.
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;