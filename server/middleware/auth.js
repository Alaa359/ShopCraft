import jwt from 'jsonwebtoken';

// Vérifie le token JWT dans l'en-tête Authorization: Bearer <token>.
// En cas de succès, ajoute l'utilisateur décodé à req.user.
export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}