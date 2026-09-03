// Frais de livraison par pays pour le paiement en ESPÈCES (côté serveur).
// Doit rester aligné sur client/src/lib/countries.js.
// Pour la carte bancaire, c'est le frais standard de cart.js qui s'applique.

export const DEFAULT_CASH_SHIPPING = 20; // pays non listé

export const CASH_SHIPPING_BY_COUNTRY = {
  TN: 8,
  DZ: 12,
  MA: 11,
  LY: 14,
  EG: 13,
  FR: 12,
  BE: 14,
  CH: 16,
  DE: 15,
  ES: 15,
  IT: 15,
  PT: 16,
  NL: 15,
  GB: 17,
  SA: 18,
  AE: 18,
  QA: 19,
  KW: 19,
  JO: 17,
  LB: 17,
  TR: 16,
  CA: 22,
  US: 22,
  // Ajouter ici d'autres pays livrés en espèces.
};

// Frais de livraison (EUR) pour un pays donné en paiement espèces.
export function cashShippingFor(countryCode) {
  if (!countryCode) return DEFAULT_CASH_SHIPPING;
  const code = String(countryCode).toUpperCase();
  return CASH_SHIPPING_BY_COUNTRY[code] ?? DEFAULT_CASH_SHIPPING;
}
