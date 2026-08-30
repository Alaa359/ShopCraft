import { prisma } from './prisma.js';

// Crée la commande + ses lignes et décrémente le stock dans une transaction.
// Utilisé par la route POST /api/orders ET par le webhook Stripe.
//
// Idempotence : si une commande existe déjà pour ce paymentIntentId,
// elle est renvoyée telle quelle (évite les doublons en cas de course
// entre la réponse synchrone et l'événement asynchrone du webhook).
export async function createOrderFromCart({ userId, cart, paymentIntentId = null }) {
  return prisma.$transaction(async (tx) => {
    if (paymentIntentId) {
      const existing = await tx.order.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });
      if (existing) return existing;
    }

    const created = await tx.order.create({
      data: {
        userId,
        total: cart.total,
        stripePaymentIntentId: paymentIntentId,
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

    // Décrémente le stock de chaque produit commandé
    for (const line of cart.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      });
    }

    return created;
  });
}

// Retourne la commande déjà créée pour un PaymentIntent donné (ou null)
export async function getOrderByPaymentIntent(paymentIntentId) {
  return prisma.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });
}