import { useSearchParams } from 'react-router-dom';

// Barre de filtres du catalogue (recherche + catégorie)
// Les filtres sont reflétés dans l'URL (?search=...&category=...)
export default function Filters({ categories = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

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
      <input
        type="search"
        placeholder="Rechercher un produit..."
        value={search}
        onChange={(e) => setFilter('search', e.target.value)}
        className="filters__search"
      />
      <select
        value={category}
        onChange={(e) => setFilter('category', e.target.value)}
        className="filters__select"
      >
        <option value="">Toutes les catégories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}