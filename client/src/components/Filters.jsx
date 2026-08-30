import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Filtres du catalogue : liste horizontale de catégories (pills)
// + panneau "Filtres avancés" rétractable (plage de prix)
// Tout est reflété dans l'URL (?search=...&category=...&minPrice=...&maxPrice=...)
export default function Filters({ categories = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const [open, setOpen] = useState(false);

  // Met à jour un filtre sans perdre les autres
  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  return (
    <div className="filters">
      <div className="filters__pills" role="tablist" aria-label="Catégories">
        <button
          type="button"
          className={`filter-pill ${category === '' ? 'is-active' : ''}`}
          onClick={() => setFilter('category', '')}
        >
          Tous
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`filter-pill ${category === c ? 'is-active' : ''}`}
            onClick={() => setFilter('category', c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="filters__advanced">
        <button
          type="button"
          className="filters__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span>Filtres avancés</span>
          <span className={`filters__chevron ${open ? 'is-open' : ''}`}>⌄</span>
        </button>
        {open && (
          <div className="filters__panel">
            <label className="filters__field">
              <span>Prix minimum (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                placeholder="0"
                onChange={(e) => setFilter('minPrice', e.target.value)}
              />
            </label>
            <label className="filters__field">
              <span>Prix maximum (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                placeholder="—"
                onChange={(e) => setFilter('maxPrice', e.target.value)}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}