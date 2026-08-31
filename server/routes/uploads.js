import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';
import { upload } from '../lib/upload.js';

const router = Router();

// POST /api/upload/image
// Upload d'une image (réservé aux administrateurs).
// Corps : multipart/form-data, champ "image" (fichier).
// Retourne { url } à enregistrer dans le tableau images du produit.
router.post('/image', auth, isAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier image reçu' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// POST /api/upload/avatar
// Upload de la photo de profil (tout utilisateur connecté).
// Corps : multipart/form-data, champ "image" (fichier). Retourne { url }.
router.post('/avatar', auth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier image reçu' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;