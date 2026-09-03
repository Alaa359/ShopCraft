// Liste des pays pour le formulaire de livraison.
// - code   : code ISO 3166-1 alpha-2
// - name   : nom du pays en français
// - dial   : indicatif téléphonique international (ex: +216)
// - flag   : drapeau emoji
// - cashShipping : frais de livraison (en EUR) facturés pour le paiement
//   en ESPÈCES à destination de ce pays. La carte bancaire garde le frais
//   standard (voir cartStore : SHIPPING_FEE / offert selon le montant).

export const COUNTRIES = [
  { code: 'TN', name: 'Tunisie', dial: '+216', flag: '🇹🇳', cashShipping: 8 },
  { code: 'DZ', name: 'Algérie', dial: '+213', flag: '🇩🇿', cashShipping: 12 },
  { code: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦', cashShipping: 11 },
  { code: 'LY', name: 'Libye', dial: '+218', flag: '🇱🇾', cashShipping: 14 },
  { code: 'EG', name: 'Égypte', dial: '+20', flag: '🇪🇬', cashShipping: 13 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', cashShipping: 12 },
  { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪', cashShipping: 14 },
  { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭', cashShipping: 16 },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪', cashShipping: 15 },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸', cashShipping: 15 },
  { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹', cashShipping: 15 },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', cashShipping: 16 },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱', cashShipping: 15 },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧', cashShipping: 17 },
  { code: 'SA', name: 'Arabie saoudite', dial: '+966', flag: '🇸🇦', cashShipping: 18 },
  { code: 'AE', name: 'Émirats arabes unis', dial: '+971', flag: '🇦🇪', cashShipping: 18 },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', cashShipping: 19 },
  { code: 'KW', name: 'Koweït', dial: '+965', flag: '🇰🇼', cashShipping: 19 },
  { code: 'JO', name: 'Jordanie', dial: '+962', flag: '🇯🇴', cashShipping: 17 },
  { code: 'LB', name: 'Liban', dial: '+961', flag: '🇱🇧', cashShipping: 17 },
  { code: 'TR', name: 'Turquie', dial: '+90', flag: '🇹🇷', cashShipping: 16 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', cashShipping: 22 },
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸', cashShipping: 22 },
];

// Ajoute à la liste les pays dont on connaît le code sans frais spécifique en
// renvoyant 0 (non livrable en espèces) — on conserve uniquement ceux qui ont
// un frais défini. Pour un pays inconnu, le commerce peut refuser l'espèces.
export const DEFAULT_CASH_SHIPPING = 20; // pays non listé

// Retourne le pays par code ISO (ex: 'TN'), ou null.
export function lookupCountry(code) {
  if (!code) return null;
  const c = code.toUpperCase();
  return COUNTRIES.find((x) => x.code === c) ?? null;
}

// Frais de livraison espèces (EUR) pour un pays donné.
export function cashShippingFor(countryCode) {
  return lookupCountry(countryCode)?.cashShipping ?? DEFAULT_CASH_SHIPPING;
}

// Frais de livraison espèces affiché (EUR) pour le résumé.
export function countryShippingLabel(countryCode) {
  const c = lookupCountry(countryCode);
  return c ? c.cashShipping : DEFAULT_CASH_SHIPPING;
}
