import { useCurrency } from '../lib/useCurrency.js';

// Affiche un montant (en EUR) converti dans la devise choisie par l'utilisateur.
// Ex : <Money value={59} /> -> "200,60 DT" (ou "59,00 €" en EUR)
export default function Money({ value, className, strong }) {
  const { format } = useCurrency();
  const text = format(value);
  if (strong) return <strong className={className}>{text}</strong>;
  return <span className={className}>{text}</span>;
}
