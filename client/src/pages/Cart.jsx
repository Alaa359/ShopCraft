import { Link } from 'react-router-dom';
import {
  useCartStore,
  selectCartSubtotal,
  selectCartShipping,
  selectCartTotal,
  selectCartCount,
  FREE_SHIPPING_THRESHOLD,
} from '../store/cartStore.js';
import CartItem from '../components/CartItem.jsx';

// Page panier : liste des articles + résumé sticky (sous-total, livraison, total)
export default function Cart() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const shipping = useCartStore(selectCartShipping);
  const total = useCartStore(selectCartTotal);
  const count = useCartStore(selectCartCount);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

  if (items.length === 0) {
    return (
      <div className="cart cart--empty">
        <h1 className="cart__title">Votre panier</h1>
        <p className="cart__empty-text">
          Votre panier est vide. Découvrez notre collection !
        </p>
        <div className="cart__empty-actions">
          <Link to="/" className="btn btn--primary">
            Découvrir le catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1 className="cart-page__title">
        Votre panier ({count} article{count > 1 ? 's' : ''})
      </h1>

      <div className="cart-page__layout">
        <div className="cart-page__items">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>

        <aside className="cart__summary">
          <h2 className="cart__summary-title">Résumé de la commande</h2>

          <div className="cart__summary-row">
            <span>Sous-total</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          <div className="cart__summary-row">
            <span>Livraison</span>
            <span>{shipping === 0 ? 'Offerte' : `${shipping.toFixed(2)} €`}</span>
          </div>
          {shipping > 0 && (
            <p className="cart__ship-note">
              Livraison offerte dès {FREE_SHIPPING_THRESHOLD} € d'achat.
            </p>
          )}
          <div className="cart__summary-row cart__summary-row--total">
            <span>Total</span>
            <strong>{total.toFixed(2)} €</strong>
          </div>

          <Link to="/checkout" className="btn btn--primary btn--block">
            Passer la commande
          </Link>
          <button className="btn btn--ghost btn--block" onClick={clear}>
            Vider le panier
          </button>
          <Link to="/" className="cart__continue">
            ← Continuer mes achats
          </Link>
        </aside>
      </div>
    </div>
  );
}