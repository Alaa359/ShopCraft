// Étoiles de notation en lecture seule, avec remplissage partiel.
// value = moyenne de 0 à 5 (décimale possible).
// Ex. : 4.3 => 4 étoiles pleines + 1 étoile remplie à 30 %.
// Sizes : "sm" (cartes), "md" (défaut), "lg" (fiche produit / dashboard).
export default function RatingStars({ value = 0, size = 'md', className = '', label }) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(clamped);
  const fraction = clamped - full; // 0..1
  // Index de l'étoile partiellement remplie (-1 si aucune)
  const partialIndex = full < 5 ? full : -1;

  return (
    <span
      className={`stars stars--${size} ${className}`}
      role="img"
      aria-label={label ?? `Note : ${clamped.toFixed(1)} sur 5`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        // Largeur de l'étoile dorée : 100 % (pleine), fraction (%) ou 0
        const width = index === partialIndex ? `${fraction * 100}%` : `${index < full ? 100 : 0}%`;
        return (
          <span className="stars__cell" key={index}>
            <span className="stars__base" aria-hidden="true">★</span>
            <span className="stars__fill" style={{ width }} aria-hidden="true">★</span>
          </span>
        );
      })}
    </span>
  );
}