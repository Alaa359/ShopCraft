import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct } from '../api/client.js';
import { useCartStore } from '../store/cartStore.js';

// Image principale du produit (ou placeholder)
function ProductGallery({ images, name }) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return <div className="gallery gallery--placeholder">ShopCraft</div>;
  }

  return (
    <div className="gallery">
      <img className="gallery__main" src={images[active]} alt={name} />
      {images.length > 1 && (
        <div className="gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={i}
              className={`gallery__thumb ${i === active ? 'gallery__thumb--active' : ''}`}
              onClick={() => setActive(i)}
            >
              <img src={img} alt={`${name} - visuel ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fiche produit détaillée
export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getProduct(id)
      .then((data) => !cancelled && setProduct(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="home__message">Chargement du produit...</p>;

  if (error)
    return (
      <div className="home__message home__message--error">
        <p>Erreur : {error}</p>
        <Link to="/">← Retour au catalogue</Link>
      </div>
    );

  const price = Number(product.price).toFixed(2);
  const outOfStock = product.stock <= 0;

  // Ajoute le produit au panier et affiche un retour visuel
  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="product">
      <Link to="/" className="product__back">
        ← Retour au catalogue
      </Link>

      <div className="product__layout">
        <ProductGallery images={product.images} name={product.name} />

        <div className="product__info">
          <span className="product__category">{product.category}</span>
          <h1 className="product__name">{product.name}</h1>
          <p className="product__price">{price} €</p>
          <p className="product__description">{product.description}</p>

          <p className={`product__stock ${outOfStock ? 'product__stock--out' : ''}`}>
            {outOfStock ? 'Rupture de stock' : `${product.stock} disponible(s)`}
          </p>

          {/* Ajout au panier (store Zustand) */}
          <button
            className={`product__add ${added ? 'product__add--added' : ''}`}
            onClick={handleAdd}
            disabled={outOfStock}
          >
            {added ? 'Ajouté ✓' : outOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  );
}