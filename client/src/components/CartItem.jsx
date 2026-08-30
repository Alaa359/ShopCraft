import { Link } from 'react-router-dom';

// Ligne d'un produit dans le panier : image, infos, quantité et suppression
export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const price = item.price.toFixed(2);
  const lineTotal = (item.price * item.quantity).toFixed(2);

  return (
    <div className="cart-item">
      <Link to={`/products/${item.id}`} className="cart-item__image">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="cart-item__placeholder">ShopCraft</div>
        )}
      </Link>

      <div className="cart-item__body">
        <Link to={`/products/${item.id}`} className="cart-item__name">
          {item.name}
        </Link>
        <p className="cart-item__price">{price} €</p>
      </div>

      <div className="cart-item__controls">
        <button
          className="cart-item__qty-btn"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label="Diminuer la quantité"
        >
          −
        </button>
        <span className="cart-item__qty">{item.quantity}</span>
        <button
          className="cart-item__qty-btn"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.stock}
          aria-label="Augmenter la quantité"
        >
          +
        </button>
      </div>

      <div className="cart-item__right">
        <span className="cart-item__total">{lineTotal} €</span>
        <button
          className="cart-item__remove"
          onClick={() => onRemove(item.id)}
          aria-label={`Retirer ${item.name} du panier`}
          title="Retirer du panier"
        >
          {/* Icône poubelle */}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M8 7l.7 12a1.6 1.6 0 0 0 1.6 1.5h3.4a1.6 1.6 0 0 0 1.6-1.5L16 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M10 10.5v6M14 10.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}