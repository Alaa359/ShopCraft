import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';
import { tryBuildCart } from '../lib/cart.js';
import {
  getOrderByPaymentIntent,
  createOrderFromCart,
  deliveryData,
  DELIVERY_FIELDS,
} from '../lib/orderService.js';
import { cashShippingFor } from '../lib/countries.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';

const router = Router();

// Statuts autorisés pour une commande
const ORDER_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// Méthodes de paiement acceptées
const PAYMENT_METHODS = ['CARD', 'CASH'];

// Champs de livraison obligatoires (validation côté serveur)
const REQUIRED_DELIVERY = [
  'fullName',
  'phone',
  'email',
  'address',
  'city',
  'postalCode',
  'country',
];

// Valide les informations de livraison : renvoie { ok, delivery } ou { ok:false, error }
function validateDelivery(shipping) {
  const delivery = deliveryData(shipping);
  for (const field of REQUIRED_DELIVERY) {
    if (!delivery[field]) {
      return {
        ok: false,
        error: `Le champ « ${field} » est obligatoire pour la livraison.`,
      };
    }
  }
  return { ok: true, delivery };
}

// GET /api/orders
// Liste toutes les commandes (réservé aux administrateurs).
// Filtre optionnel : ?status=PENDING|SHIPPED|DELIVERED|CANCELLED
router.get('/', auth, isAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && ORDER_STATUSES.includes(status)) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true, category: true, images: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/status
// Met à jour le statut d'une commande (réservé aux administrateurs).
router.put('/:id/status', auth, isAdmin, async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Statut invalide. Valeurs possibles : ${ORDER_STATUSES.join(', ')}`,
      });
    }

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders
// Crée une commande pour l'utilisateur connecté (protégé).
// Body : { items, shipping: { fullName, phone, email, address, city,
//         postalCode, country, note? }, paymentMethod: 'CARD'|'CASH',
//         paymentIntentId? }
// - CASH (espèces à la livraison) : la commande est créée sans paiement
//   en ligne ; paymentStatus = UNPAID.
// - CARD (carte bancaire) : si paymentIntentId est fourni, le serveur
//   vérifie auprès de Stripe que le paiement a bien été confirmé.
router.post('/', auth, async (req, res, next) => {
  try {
    const { items, paymentIntentId } = req.body ?? {};
    const shipping = req.body?.shipping ?? {};
    const paymentMethod = req.body?.paymentMethod ?? 'CARD';

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        error: `Méthode de paiement invalide. Valeurs possibles : ${PAYMENT_METHODS.join(', ')}`,
      });
    }

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
    const cart = await tryBuildCart(items, res);
    if (!cart) return; // réponse 400 déjà envoyée (panier invalide)

    // Vérification serveur du paiement (uniquement si Stripe est utilisé)
    if (paymentMethod === 'CARD') {
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
    } else {
      // Cash : aucun PaymentIntent attendu
      if (paymentIntentId) {
        return res.status(400).json({ error: 'paymentIntentId inattendu pour un paiement en espèces' });
      }
    }

    // Valide toujours les informations de livraison
    const validation = validateDelivery(shipping);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    // Pour les espèces, le prix augmente selon le pays de livraison :
    // on remplace le frais de livraison standard par celui du pays.
    let orderCart = cart;
    if (paymentMethod === 'CASH') {
      const cashFee = cashShippingFor(validation.delivery.country);
      orderCart = { ...cart, shipping: cashFee, total: cart.subtotal + cashFee };
    }

    // Crée la commande (transaction + décrémentation du stock)
    const order = await createOrderFromCart({
      userId: req.user.id,
      cart: orderCart,
      paymentIntentId: paymentMethod === 'CARD' ? paymentIntentId : null,
      shipping: validation.delivery,
      paymentMethod,
      paymentStatus: paymentMethod === 'CASH' ? 'UNPAID' : 'PAID',
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