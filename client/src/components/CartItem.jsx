// Ligne d'un produit dans le panier : image, infos, quantité et suppression
export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const price = item.price.toFixed(2);
  const lineTotal = (item.price * item.quantity).toFixed(2);

  return (
    <div className="cart-item">
      <div className="cart-item__image">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="cart-item__placeholder">ShopCraft</div>
        )}
      </div>

      <div className="cart-item__body">
        <h3 className="cart-item__name">{item.name}</h3>
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
        <button className="cart-item__remove" onClick={() => onRemove(item.id)}>
          Supprimer
        </button>
      </div>
    </div>
  );
}