import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { verifyGoogleToken } from '../lib/google.js';

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
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
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

    // Compte créé via Google : pas de mot de passe local
    if (user.provider !== 'local' || !user.password) {
      return res.status(401).json({ error: 'Ce compte utilise Google. Cliquez sur « Continuer avec Google ».' });
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

// POST /api/auth/google
// Connexion / inscription via le bouton "Continuer avec Google".
// Body : { idToken } (token d'ID Google obtenu côté client).
// Le serveur valide le token auprès de Google, puis crée le compte s'il
// n'existe pas, ou le connecte s'il existe, et renvoie { token, user }.
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body ?? {};

    const profile = await verifyGoogleToken(idToken);
    if (!profile) {
      return res.status(401).json({
        error:
          'Connexion Google refusée. Vérifiez que GOOGLE_CLIENT_ID est configuré côté serveur.',
      });
    }

    // Recherche du compte par googleId (le plus fiable), puis par email
    // (pour rattacher un compte local existant ayant le même email).
    const existing =
      (await prisma.user.findUnique({ where: { googleId: profile.googleId } })) ||
      (await prisma.user.findUnique({ where: { email: profile.email } }));

    let user;
    if (existing) {
      // Rattache l'identifiant Google et les infos de profil si manquantes
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: existing.googleId || profile.googleId,
          provider: 'google',
          displayName: existing.displayName || profile.name,
          avatar: existing.avatar || profile.picture,
        },
      });
    } else {
      // Nouveau compte Google (pas de mot de passe local)
      user = await prisma.user.create({
        data: {
          email: profile.email,
          password: null,
          provider: 'google',
          googleId: profile.googleId,
          displayName: profile.name,
          avatar: profile.picture,
        },
      });
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
      select: { id: true, email: true, role: true, displayName: true, avatar: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me — met à jour le profil (nom affiché, photo de profil)
router.patch('/me', auth, async (req, res, next) => {
  try {
    const { displayName, avatar } = req.body ?? {};
    const data = {};

    if (displayName !== undefined) {
      const name = displayName == null ? '' : String(displayName).trim();
      if (name.length > 60) {
        return res.status(400).json({ error: 'Le nom affiché doit contenir moins de 60 caractères' });
      }
      data.displayName = name || null;
    }

    if (avatar !== undefined) {
      const url = avatar == null ? '' : String(avatar).trim();
      if (url.length > 500) {
        return res.status(400).json({ error: 'URL de photo de profil invalide' });
      }
      data.avatar = url || null;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;