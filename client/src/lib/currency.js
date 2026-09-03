// Monnaies et conversion EUR -> devise d'affichage/paiement.
// Les prix du catalogue sont stockés en EUR (serveur + base). L'utilisateur
// peut basculer la devise d'affichage (EUR ou DT) depuis les Paramètres.
// Le taux EUR/DT est récupéré en ligne (frankfurter.app, gratuit, sans clé)
// car 1 EUR est variable. Un taux de secours est utilisé hors ligne.

export const BASE_CURRENCY = 'EUR';

export const CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€', label: 'Euro' },
  DT: { code: 'DT', symbol: 'DT', label: 'Dinar tunisien' },
};

// Taux de secours EUR -> devise utilisés si l'API en ligne est indisponible
const DEFAULT_RATES = { EUR: 1, DT: 3.4 };

// Le taux est récupéré via l'endpoint backend /api/rates (qui fait le fetch
// côté serveur, évitant les limites CORS du navigateur).
const RATE_API = '/api/rates';
const CACHE_MS = 60 * 60 * 1000; // re-consulte au plus une fois par heure

let cachedRates = { ...DEFAULT_RATES };
let cachedAt = 0;
let inflight = null;

// Récupère les taux EUR -> devise. Renvoie toujours un objet {EUR, DT,...}.
export async function fetchExchangeRates(force = false) {
  const now = Date.now();
  if (!force && cachedRates && now - cachedAt < CACHE_MS) {
    return { ...cachedRates, fresh: true };
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(RATE_API, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const tnd = Number(data?.rates?.DT);
        if (Number.isFinite(tnd) && tnd > 0) {
          cachedRates = { ...DEFAULT_RATES, DT: tnd };
          cachedAt = now;
        } else {
          cachedRates = { ...DEFAULT_RATES, DT: 3.4 };
          cachedAt = now;
        }
      }
    } catch (_) {
      /* hors ligne : on garde le taux de secours */
    } finally {
      inflight = null;
    }
    return { ...cachedRates, fresh: false };
  })();
  return inflight;
}

// Convertis un montant en EUR vers la devise choisie.
export function convert(eurAmount, currency, rates = cachedRates) {
  const rate = rates?.[currency] ?? DEFAULT_RATES[currency] ?? 1;
  return Number(eurAmount) * rate;
}

// Formate un montant (en EUR) dans la devise choisie.
// Ex : convertMoney(59, 'DT') -> "200,60 DT" ; convertMoney(59, 'EUR') -> "59,00 €"
export function convertMoney(eurAmount, currency, rates = cachedRates) {
  const value = convert(eurAmount, currency, rates);
  const symbol = CURRENCIES[currency]?.symbol ?? (currency === 'DT' ? 'DT' : '€');
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
}
