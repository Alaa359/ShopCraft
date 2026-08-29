import { Link } from 'react-router-dom';

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
export default function ProductCard({ product }) {
  const price = Number(product.price).toFixed(2);

  return (
    <Link to={`/products/${product.id}`} className="card">
      <div className="card__image">
        <ProductImage product={product} />
      </div>
      <div className="card__body">
        <span className="card__category">{product.category}</span>
        <h3 className="card__title">{product.name}</h3>
        <div className="card__footer">
          <span className="card__price">{price} €</span>
          <span className={`card__stock ${product.stock > 0 ? '' : 'card__stock--out'}`}>
            {product.stock > 0 ? 'En stock' : 'Rupture'}
          </span>
        </div>
      </div>
    </Link>
  );
}