import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();

// Middlewares globaux
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// Route de vérification de l'API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes métiers
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);

// 404 pour toute route inconnue
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Gestion centralisée des erreurs
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API ShopCraft démarrée sur http://localhost:${PORT}`);
});