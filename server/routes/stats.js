import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = Router();

// GET /api/admin/stats
// Statistiques simples pour le dashboard (réservé aux administrateurs) :
// revenus totaux, nombre de commandes, utilisateurs, produits les plus vendus.
router.get('/', auth, isAdmin, async (req, res, next) => {
  try {
    // Revenus totaux : somme des commandes non annulées
    const [revenueAgg, ordersCount, pendingOrders, usersCount, topSold] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
      // Quantités vendues par produit (toutes commandes confondues)
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Enrichit le top 5 avec le nom + l'image de chaque produit
    const productIds = topSold.map((entry) => entry.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true },
    });
    const productById = Object.fromEntries(products.map((p) => [p.id, p]));

    const topProducts = topSold
      .map((entry) => ({
        productId: entry.productId,
        name: productById[entry.productId]?.name ?? 'Produit supprimé',
        image: productById[entry.productId]?.images?.[0] ?? null,
        quantitySold: entry._sum.quantity ?? 0,
      }))
      .filter((entry) => entry.name !== 'Produit supprimé');

    res.json({
      totalRevenue: revenueAgg._sum.total ?? 0,
      ordersCount,
      pendingOrders,
      usersCount,
      topProducts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;