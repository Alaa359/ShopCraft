import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = Router();

// GET /api/products
// Liste les produits avec filtres optionnels :
//   ?category=..., ?search=..., ?minPrice=..., ?maxPrice=...
router.get('/', async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = parseFloat(minPrice);
      if (maxPrice !== undefined) where.price.lte = parseFloat(maxPrice);
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
// Détail d'un produit avec ses avis
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
// Crée un nouveau produit (réservé aux administrateurs)
router.post('/', auth, isAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock, category, images } = req.body;

    // Validation minimale côté serveur
    if (!name || !description || price === undefined || !category) {
      return res
        .status(400)
        .json({ error: 'Champs requis : name, description, price, category' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: stock ?? 0,
        category,
        images: Array.isArray(images) ? images : [],
      },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
// Met à jour tout ou partie d'un produit (réservé aux administrateurs)
router.put('/:id', auth, isAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock, category, images } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock }),
        ...(category !== undefined && { category }),
        ...(images !== undefined && { images }),
      },
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
// Supprime un produit (réservé aux administrateurs)
router.delete('/:id', auth, isAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    // P2003 = erreur de contrainte d'intégrité (produit référencé par des commandes)
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: 'Impossible de supprimer ce produit : il figure dans une ou plusieurs commandes.',
      });
    }
    next(err);
  }
});

export default router;