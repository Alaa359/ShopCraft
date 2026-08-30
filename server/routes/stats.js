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
    const [revenueAgg, ordersCount, pendingOrders, usersCount, topSold, stockAgg, ratingAgg, topRatedAgg] =
      await Promise.all([
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
        // Stock total disponible (tous produits)
        prisma.product.aggregate({ _sum: { stock: true } }),
        // Note moyenne globale sur tous les avis
        prisma.review.aggregate({ _avg: { rating: true } }),
        // Top 5 des produits les mieux notés (moyenne des avis)
        prisma.review.groupBy({
          by: ['productId'],
          _avg: { rating: true },
          _count: { _all: true },
          orderBy: { _avg: { rating: 'desc' } },
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

    // Top 5 des mieux notés : enrichit avec nom, image et quantités vendues
    const topRatedIds = topRatedAgg.map((entry) => entry.productId);
    const [ratedProducts, ratedSales] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: topRatedIds } },
        select: { id: true, name: true, images: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { productId: { in: topRatedIds } },
        _sum: { quantity: true },
      }),
    ]);
    const ratedById = Object.fromEntries(ratedProducts.map((p) => [p.id, p]));
    const salesById = Object.fromEntries(
      ratedSales.map((s) => [s.productId, s._sum.quantity ?? 0])
    );

    const topRated = topRatedAgg
      .map((entry) => ({
        productId: entry.productId,
        name: ratedById[entry.productId]?.name ?? 'Produit supprimé',
        image: ratedById[entry.productId]?.images?.[0] ?? null,
        avgRating: +(entry._avg.rating ?? 0).toFixed(1),
        reviewCount: entry._count._all ?? 0,
        quantitySold: salesById[entry.productId] ?? 0,
      }))
      .filter((entry) => entry.name !== 'Produit supprimé');

    res.json({
      totalRevenue: revenueAgg._sum.total ?? 0,
      ordersCount,
      pendingOrders,
      usersCount,
      stockCount: stockAgg._sum.stock ?? 0,
      avgRating: ratingAgg._avg.rating ? +ratingAgg._avg.rating.toFixed(1) : 0,
      topProducts,
      topRated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;