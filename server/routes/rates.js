// Endpoint qui fournit le taux de change EUR -> TND (et autres devises).
// Le fetch est fait côté serveur pour éviter les limitations CORS du navigateur.
// Si l'API publique est injoignable, on renvoie un taux de secours.
import { Router } from 'express';

const router = Router();

const DEFAULT_RATES = { EUR: 1, DT: 3.4 };
const RATE_API = 'https://api.frankfurter.app/latest?from=EUR&to=TND';
const CACHE_MS = 60 * 60 * 1000; // 1 heure

let cached = null;
let cachedAt = 0;

// GET /api/rates  ->  { rates: { EUR, DT }, source: 'live' | 'fallback', updatedAt }
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (!cached || now - cachedAt > CACHE_MS) {
      try {
        const r = await fetch(RATE_API, { signal: AbortSignal.timeout(6000) });
        if (r.ok) {
          const data = await r.json();
          const tnd = Number(data?.rates?.TND);
          if (!Number.isFinite(tnd) || tnd <= 0) throw new Error('Taux invalide');
          cached = { rates: { EUR: 1, DT: tnd }, source: 'live' };
          cachedAt = now;
        } else {
          throw new Error('API non dispo');
        }
      } catch (_) {
        cached = { rates: { ...DEFAULT_RATES }, source: 'fallback' };
        cachedAt = now;
      }
    }
    res.json({ ...cached, updatedAt: cachedAt });
  } catch (err) {
    res.json({ rates: { ...DEFAULT_RATES }, source: 'fallback', updatedAt: Date.now() });
  }
});

export default router;
