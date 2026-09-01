import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Vérifie le token JWT dans l'en-tête Authorization: Bearer <token>.
// En cas de succès, ajoute l'utilisateur décodé à req.user.
// Vérifie aussi que l'utilisateur existe toujours en base : un token dont le
// compte a été supprimé (ou jamais recréé) est rejeté (401) au lieu de causer
// une erreur de clé étrangère sur les routes qui utilisent req.user.id.
export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    return res.status(401).json({ error: 'Compte introuvable. Veuillez vous reconnecter.' });
  }

  req.user = user;
  next();
}