import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Filters from '../components/Filters.jsx';
import ProductCardSkeleton from '../components/Skeleton.jsx';

// Page d'accueil : bannière (hero) + catalogue filtrable
export default function Home() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recharge les produits quand les filtres changent
  useEffect(() => {
    let cancelled = false;

    getProducts({ search, category, minPrice, maxPrice })
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
  }, [search, category, minPrice, maxPrice]);

  const hasFilter = search || category || minPrice || maxPrice;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Collection premium</p>
          <h1 className="hero__title">L'élégance, faite avec soin</h1>
          <p className="hero__text">
            Des pièces sélectionnées pour sublimer votre quotidien. Livraison offerte dès 100 €.
          </p>
          <a href="#catalogue" className="btn btn--light">
            Découvrir la collection
          </a>
        </div>
        <div className="hero__badge" aria-hidden="true">
          <span>100%</span>
          élégance
        </div>
      </section>

      <section id="catalogue" className="catalogue">
        {!hasFilter && <h1 className="catalogue__title">Notre catalogue</h1>}
        {hasFilter && <h1 className="catalogue__title">Résultats de votre recherche</h1>}
        <Filters categories={categories} />

        {loading && (
          <div className="grid" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && <p className="catalogue__message catalogue__message--error">Erreur : {error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="catalogue__message">Aucun produit ne correspond à vos critères.</p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}