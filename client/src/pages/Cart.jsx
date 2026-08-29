import { Link } from 'react-router-dom';
import { useCartStore, selectCartTotal, selectCartCount } from '../store/cartStore.js';
import CartItem from '../components/CartItem.jsx';

// Page panier : liste des articles, quantités, total
export default function Cart() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectCartTotal);
  const count = useCartStore(selectCartCount);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

  if (items.length === 0) {
    return (
      <div className="cart cart--empty">
        <h1 className="cart__title">Votre panier</h1>
        <p className="home__message">Votre panier est vide.</p>
        <div className="cart__actions">
          <Link to="/" className="btn btn--primary">
            Découvrir le catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <h1 className="cart__title">Votre panier ({count} article{count > 1 ? 's' : ''})</h1>

      <div className="cart__items">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      <div className="cart__summary">
        <div className="cart__summary-row">
          <span>Total</span>
          <strong>{total.toFixed(2)} €</strong>
        </div>
        <div className="cart__actions">
          {/* Checkout activé à l'étape 5 */}
          <button className="btn btn--primary" disabled>
            Passer la commande
          </button>
          <button className="btn btn--ghost" onClick={clear}>
            Vider le panier
          </button>
        </div>
        <Link to="/" className="cart__continue">
          ← Continuer mes achats
        </Link>
      </div>
    </div>
  );
}