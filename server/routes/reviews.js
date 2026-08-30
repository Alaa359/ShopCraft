import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Sélecteur utilisateur réutilisé dans les réponses
const SELECT_USER = { user: { select: { id: true, email: true } } };

// Normalise et valide la note (entier de 1 à 5) ou renvoie null si invalide
function parseRating(rating) {
  const value = Math.floor(Number(rating));
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

// Valide le commentaire (obligatoire, max 500 caractères)
function parseComment(comment) {
  const text = String(comment ?? '').trim();
  return text && text.length <= 500 ? text : null;
}

// POST /api/reviews
// Ajoute un avis sur un produit (utilisateur connecté obligatoire).
// Body : { productId, rating (1-5), comment }
// Contrainte DB : un seul avis par utilisateur et par produit.
router.post('/', auth, async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body ?? {};

    const note = productId ? parseRating(rating) : null;
    const text = parseComment(comment);

    if (!productId || note === null) {
      return res.status(400).json({ error: 'Note requise : entier entre 1 et 5' });
    }
    if (text === null) {
      return res.status(400).json({ error: 'Un commentaire (max 500 caractères) est requis' });
    }

    // Vérifie que le produit existe
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    try {
      const review = await prisma.review.create({
        data: { productId, userId: req.user.id, rating: note, comment: text },
        include: SELECT_USER,
      });
      res.status(201).json(review);
    } catch (err) {
      // P2002 = contrainte unique (productId, userId) déjà respectée par un avis existant
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Vous avez déjà noté ce produit.' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// PUT /api/reviews/:id
// Modifie son propre avis (utilisateur connecté obligatoire).
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { rating, comment } = req.body ?? {};

    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Avis introuvable' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres avis' });
    }

    const data = {};
    if (rating !== undefined) {
      const note = parseRating(rating);
      if (note === null) {
        return res.status(400).json({ error: 'Note invalide : entier entre 1 et 5' });
      }
      data.rating = note;
    }
    if (comment !== undefined) {
      const text = parseComment(comment);
      if (text === null) {
        return res.status(400).json({ error: 'Un commentaire (max 500 caractères) est requis' });
      }
      data.comment = text;
    }

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data,
      include: SELECT_USER,
    });
    res.json(review);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reviews/:id
// Supprime son propre avis (utilisateur connecté obligatoire).
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Avis introuvable' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres avis' });
    }
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ message: 'Avis supprimé' });
  } catch (err) {
    next(err);
  }
});

export default router;