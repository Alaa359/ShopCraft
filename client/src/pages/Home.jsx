import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Filters from '../components/Filters.jsx';

// Page d'accueil : catalogue de produits avec filtres
export default function Home() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recharge les produits quand les filtres changent
  useEffect(() => {
    let cancelled = false;

    getProducts({ search, category })
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
        // Construit la liste des catégories à partir des produits
        setCategories([...new Set(data.map((p) => p.category).filter(Boolean))].sort());
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [search, category]);

  return (
    <div className="home">
      <h1 className="home__title">Notre catalogue</h1>
      <Filters categories={categories} />

      {loading && <p className="home__message">Chargement des produits...</p>}

      {error && <p className="home__message home__message--error">Erreur : {error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="home__message">Aucun produit ne correspond à vos critères.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}