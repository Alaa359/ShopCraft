import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore.js';
import { useUiStore } from '../store/uiStore.js';
import { useCurrency } from '../lib/useCurrency.js';
import RatingStars from './RatingStars.jsx';

// Seuils pour les badges d'information sur la carte
const LOW_STOCK_THRESHOLD = 5; // en dessous : "Plus que X en stock"
const NEW_THRESHOLD_DAYS = 30; // produit créé il y a moins de N jours : "Nouveau"

// Image affichée dans la carte (ou placeholder si aucune)
function ProductImage({ product }) {
  const src = product.images?.[0];
  return src ? (
    <img src={src} alt={product.name} loading="lazy" />
  ) : (
    <div className="card__placeholder">ShopCraft</div>
  );
}

// Badges en haut à gauche : stock faible (rouge doux) ou produit récent (vert)
function CardBadges({ product }) {
  const { stock, createdAt } = product;

  if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="card__badge card__badge--low">
        Plus que {stock} en stock
      </span>
    );
  }

  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs <= NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) {
    return <span className="card__badge card__badge--new">Nouveau</span>;
  }

  return null;
}

// Carte produit affichée dans la grille
// Image carrée, badges, note moyenne issue des avis réels et bouton
// "Ajouter au panier" révélé au survol de la carte.
export default function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useUiStore((state) => state.showToast);
  const price = useCurrency().format(product.price);
  const stock = Math.max(0, Number(product.stock) || 0);
  const outOfStock = stock <= 0;
  const reviewCount = product.reviewCount ?? 0;

  const [qty, setQty] = useState(1);
  const [overstock, setOverstock] = useState(false);

  function handleInc(e) {
    e.preventDefault();
    e.stopPropagation();
    if (qty < stock) {
      setQty(qty + 1);
      setOverstock(false);
    } else {
      setOverstock(true);
    }
  }

  function handleDec(e) {
    e.preventDefault();
    e.stopPropagation();
    if (qty > 1) {
      setQty(qty - 1);
      setOverstock(false);
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, qty);
    setOverstock(false);
    showToast(`${product.name} ajouté au panier (×${qty})`);
  }

  return (
    <div className="card">
      <div className="card__media">
        <Link to={`/products/${product.id}`} className="card__image">
          <ProductImage product={product} />
        </Link>
        <CardBadges product={product} />

        {!outOfStock && (
          <div className="card__cta">
            <span className="card__cta-label">Quantité</span>
            <div className="card__qty">
              <button
                type="button"
                className="card__qty-btn"
                onClick={handleDec}
                disabled={qty <= 1}
                aria-label="Diminuer la quantité"
              >
                −
              </button>
              <span className="card__qty-count">{qty}</span>
              <button
                type="button"
                className="card__qty-btn"
                onClick={handleInc}
                aria-label="Augmenter la quantité"
              >
                +
              </button>
            </div>
            <button type="button" className="card__cta-add" onClick={handleAdd}>
              Ajouter au panier
            </button>
            {overstock && (
              <span className="card__qty-hint" role="alert">
                Stock insuffisant ({stock} disponible{stock > 1 ? 's' : ''})
              </span>
            )}
          </div>
        )}

        {outOfStock && (
          <button type="button" className="card__add" disabled>
            Rupture de stock
          </button>
        )}
      </div>
      <div className="card__body">
        <span className="card__category">{product.category}</span>
        <Link to={`/products/${product.id}`} className="card__title">
          {product.name}
        </Link>

        {/* Note moyenne réelle (calculée côté serveur depuis les avis) */}
        <div className="card__rating">
          <RatingStars value={product.avgRating ?? 0} size="sm" />
          <span className="card__rating-count">
            {reviewCount === 0 ? 'aucun avis' : `${reviewCount} avis`}
          </span>
        </div>

        <div className="card__footer">
          <span className="card__price">{price}</span>
          <span className={`card__stock ${outOfStock ? 'card__stock--out' : ''}`}>
            {outOfStock ? 'Rupture' : 'En stock'}
          </span>
        </div>
      </div>
    </div>
  );
}