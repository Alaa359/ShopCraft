import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore.js';
import { useUiStore } from '../store/uiStore.js';
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
  const price = Number(product.price).toFixed(2);
  const outOfStock = product.stock <= 0;
  const reviewCount = product.reviewCount ?? 0;

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product);
    showToast(`${product.name} ajouté au panier`);
  }

  return (
    <div className="card">
      <div className="card__media">
        <Link to={`/products/${product.id}`} className="card__image">
          <ProductImage product={product} />
        </Link>
        <CardBadges product={product} />
        <button
          type="button"
          className="card__add"
          onClick={handleAdd}
          disabled={outOfStock}
        >
          {outOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
        </button>
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
          <span className="card__price">{price} €</span>
          <span className={`card__stock ${outOfStock ? 'card__stock--out' : ''}`}>
            {outOfStock ? 'Rupture' : 'En stock'}
          </span>
        </div>
      </div>
    </div>
  );
}