import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Signe un token JWT pour l'utilisateur donné
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Convertit un utilisateur en objet JSON sans données sensibles
function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
}

// POST /api/auth/register — création de compte
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    // Validation côté serveur
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Adresse email invalide' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — connexion
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Message volontairement générique pour ne pas révéler l'existence d'un compte
    const invalid = { error: 'Email ou mot de passe incorrect' };
    if (!user) {
      return res.status(401).json(invalid);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json(invalid);
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — profil de l'utilisateur connecté (protégé)
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;