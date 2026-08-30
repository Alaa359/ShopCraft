// Carte squelette (placeholder animé) pendant le chargement des produits
export default function ProductCardSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card__media skeleton">
        <div className="skeleton__block" style={{ aspectRatio: '1 / 1' }} />
      </div>
      <div className="card__body">
        <div className="skeleton__block" style={{ height: 12, width: '40%' }} />
        <div className="skeleton__block" style={{ height: 18, width: '80%', marginTop: 10 }} />
        <div className="skeleton__block" style={{ height: 14, width: '30%', marginTop: 12 }} />
      </div>
    </div>
  );
}