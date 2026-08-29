// Doit être utilisé APRÈS le middleware auth (requiert req.user).
// Refuse l'accès à toute personne qui n'est pas ADMIN.
export function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}