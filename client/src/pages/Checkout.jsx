import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  useCartStore,
  selectCartSubtotal,
  selectCartShipping,
  selectCartTotal,
  selectCartCount,
} from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';
import { createPaymentIntent, createOrder } from '../api/client.js';

// Formulaire de paiement Stripe (utilisé uniquement en mode réel)
function StripeForm({ clientSecret, total, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    // Confirme le paiement avec le client_secret créé côté serveur
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
      return;
    }

    // Paiement différé (ex. moyen de paiement en attente) : la commande
    // sera créée automatiquement par le webhook Stripe côté serveur.
    if (paymentIntent.status === 'processing' || paymentIntent.status === 'requires_capture') {
      onError('Le paiement est en cours de traitement. La commande sera confirmée automatiquement.');
    } else {
      onError('Le paiement nécessite une étape supplémentaire. Réessayez.');
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handlePay} className="checkout__stripe">
      <PaymentElement />
      <button type="submit" className="btn btn--primary" disabled={!stripe || processing}>
        {processing ? 'Paiement en cours...' : `Payer ${total.toFixed(2)} €`}
      </button>
    </form>
  );
}

// Page de paiement
export default function Checkout() {
  const token = useAuthStore((state) => state.token);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const shipping = useCartStore(selectCartShipping);
  const total = useCartStore(selectCartTotal);
  const count = useCartStore(selectCartCount);
  const clear = useCartStore((state) => state.clear);

  const location = useLocation();
  const [phase, setPhase] = useState('loading'); // loading | ready | success
  const [mode, setMode] = useState(null); // 'stripe' | 'simulated'
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState(null);

  const cartItems = items.map((i) => ({ productId: i.id, quantity: i.quantity }));

  // Non connecté -> redirection vers la connexion
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Panier vide -> renvoie vers le catalogue
  if (items.length === 0 && phase !== 'success') {
    return (
      <div className="checkout">
        <h1 className="checkout__title">Paiement</h1>
        <p className="home__message">Votre panier est vide.</p>
        <Link to="/" className="btn btn--primary">
          Découvrir le catalogue
        </Link>
      </div>
    );
  }

  // Prépare le paiement une seule fois au montage.
  // Gère aussi le retour de redirection 3DS : si le PaymentIntent a déjà
  // été confirmé par Stripe, on crée la commande directement.
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setError(null);

    async function prepare() {
      try {
        const data = await createPaymentIntent(token, cartItems);
        if (cancelled) return;
        setMode(data.mode);
        setClientSecret(data.clientSecret);

        if (data.mode === 'stripe' && data.publicKey && data.clientSecret) {
          const stripeInstance = await loadStripe(data.publicKey);
          if (cancelled) return;
          setStripePromise(stripeInstance);

          // Retour de redirection 3DS : vérifie si le paiement est déjà confirmé
          const result = await stripeInstance.retrievePaymentIntent(data.clientSecret);
          if (cancelled) return;
          if (result.paymentIntent?.status === 'succeeded') {
            await completeOrder(result.paymentIntent.id);
            return;
          }
        }
        setPhase('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setPhase('ready');
        }
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Crée la commande côté serveur puis affiche la confirmation
  async function completeOrder(paymentIntentId = null) {
    setProcessing(true);
    setError(null);
    try {
      const created = await createOrder(token, cartItems, paymentIntentId);
      setOrder(created);
      clear();
      setPhase('success');
    } catch (err) {
      setError(err.message);
      setProcessing(false);
      setPhase('ready');
    }
  }

  // Mode test sans clés Stripe : bouton de commande direct
  function handleSimulatedPay() {
    completeOrder(null);
  }

  // ---------- Vue succès ----------
  if (phase === 'success' && order) {
    return (
      <div className="checkout">
        <div className="checkout__success">
          <h1 className="checkout__title">Merci ! Commande confirmée</h1>
          <p className="checkout__success-text">
            Votre commande <strong>#{order.id.slice(-8).toUpperCase()}</strong> d'un montant de{' '}
            <strong>{Number(order.total).toFixed(2)} €</strong> a bien été enregistrée.
          </p>
          <div className="checkout__success-actions">
            <Link to="/account" className="btn btn--primary">
              Voir mes commandes
            </Link>
            <Link to="/" className="btn btn--ghost">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Vue paiement ----------
  return (
    <div className="checkout">
      <h1 className="checkout__title">Paiement</h1>

      <div className="checkout__layout">
        <div className="checkout__form">
          {phase === 'loading' && <p className="home__message">Préparation du paiement...</p>}

          {error && <p className="auth__error">{error}</p>}

          {phase === 'ready' && mode === 'stripe' && stripePromise && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeForm
                total={total}
                onSuccess={(intentId) => completeOrder(intentId)}
                onError={setError}
              />
            </Elements>
          )}

          {phase === 'ready' && mode === 'simulated' && (
            <div className="checkout__simulated">
              <p className="checkout__sim-note">
                Mode test : aucune clé Stripe configurée. Le paiement est simulé — la commande
                sera créée directement. Activez vos clés Stripe dans <code>server/.env</code> pour
                activer le vrai paiement.
              </p>
              <button
                className="btn btn--primary"
                onClick={handleSimulatedPay}
                disabled={processing}
              >
                {processing ? 'Commande en cours...' : `Commander et payer ${total.toFixed(2)} € (simulé)`}
              </button>
            </div>
          )}
        </div>

        <div className="checkout__summary">
          <h2 className="checkout__summary-title">Résumé ({count} article{count > 1 ? 's' : ''})</h2>
          {items.map((item) => (
            <div className="checkout__line" key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{(item.price * item.quantity).toFixed(2)} €</span>
            </div>
          ))}
          <div className="checkout__line">
            <span>Sous-total</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          <div className="checkout__line">
            <span>Livraison</span>
            <span>{shipping === 0 ? 'Offerte' : `${shipping.toFixed(2)} €`}</span>
          </div>
          <div className="checkout__line checkout__line--total">
            <strong>Total</strong>
            <strong>{total.toFixed(2)} €</strong>
          </div>
          <Link to="/cart" className="checkout__back">
            ← Retour au panier
          </Link>
        </div>
      </div>
    </div>
  );
}