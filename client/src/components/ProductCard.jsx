import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore.js';
import { useUiStore } from '../store/uiStore.js';

// Image affichée dans la carte (ou placeholder si aucune)
function ProductImage({ product }) {
  const src = product.images?.[0];
  return src ? (
    <img src={src} alt={product.name} loading="lazy" />
  ) : (
    <div className="card__placeholder">ShopCraft</div>
  );
}

// Carte produit affichée dans la grille
// Image carrée, zoom au survol et bouton "Ajouter au panier" révélé au hover
export default function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useUiStore((state) => state.showToast);
  const price = Number(product.price).toFixed(2);
  const outOfStock = product.stock <= 0;

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