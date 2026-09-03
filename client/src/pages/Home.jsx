import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Filters from '../components/Filters.jsx';
import ProductCardSkeleton from '../components/Skeleton.jsx';
import { useCurrency } from '../lib/useCurrency.js';

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

  const { format } = useCurrency();

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
            Des pièces sélectionnées pour sublimer votre quotidien. Livraison offerte dès{' '}
            {format(100)}.
          </p>
          <div className="hero__cta">
            <a href="#catalogue" className="btn btn--primary btn--lg">
              Découvrir la collection
            </a>
            <a href="#selection" className="btn btn--ghost btn--lg">
              Nos univers
            </a>
          </div>
          <p className="hero__note">
            <span>Livraison offerte dès {format(100)}</span>
            <span>Retours sous 30 jours</span>
            <span>Paiement 100 % sécurisé</span>
          </p>
        </div>
        <div className="hero__seal" aria-hidden="true">
          <span className="hero__seal-num">100 %</span>
          <span className="hero__seal-text">élégance</span>
        </div>
      </section>

      {!hasFilter && categories.length > 1 && (
        <section id="selection" className="selection">
          <div className="selection__head">
            <p className="selection__eyebrow">Nos univers</p>
            <h2 className="selection__title">Une sélection par catégorie</h2>
          </div>
          <div className="selection__cards">
            {categories.map((cat) => {
              const img = products.find((p) => p.category === cat)?.images?.[0];
              return (
                <Link
                  key={cat}
                  to={`/?category=${encodeURIComponent(cat)}`}
                  className="selection__card"
                >
                  {img ? (
                    <img className="selection__img" src={img} alt="" loading="lazy" />
                  ) : (
                    <div className="selection__img selection__img--empty" />
                  )}
                  <span className="selection__name">{cat}</span>
                  <span className="selection__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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