import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useCartStore,
  selectCartSubtotal,
  selectCartShipping,
  selectCartCount,
} from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';
import { createPaymentIntent, createOrder } from '../api/client.js';
import { useCurrency } from '../lib/useCurrency.js';
import { COUNTRIES, lookupCountry, cashShippingFor } from '../lib/countries.js';

// Champs du formulaire de livraison
const DELIVERY_FIELDS = {
  fullName: { label: 'Nom complet', type: 'text', required: true, autoComplete: 'name' },
  email: { label: 'Email de livraison', type: 'email', required: true, autoComplete: 'email' },
  phone: { label: 'Téléphone', type: 'tel', required: true, autoComplete: 'tel' },
  address: { label: 'Adresse', type: 'text', required: true, autoComplete: 'address-line1' },
  postalCode: { label: 'Code postal', type: 'text', required: true, autoComplete: 'postal-code', half: true },
  city: { label: 'Ville', type: 'text', required: true, autoComplete: 'address-level2', half: true },
  country: { label: 'Pays', type: 'text', required: true, autoComplete: 'country-name' },
};

// Icônes décoratives des méthodes de paiement
function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 9.5h19M6 14.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.2h.01M17.5 13.8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Détection du réseau de carte à partir du numéro (prefixes de marques courants).
// Renvoie { brand, color, gradient } pour personnaliser l'aperçu.
function detectCardBrand(number) {
  const n = (number || '').replace(/\D/g, '');
  const test = (re) => re.test(n);
  if (test(/^4/)) return { brand: 'Visa', color: '#1a1f71', accent: '#f7b600' };
  if (test(/^5[1-5]/) || test(/^2[2-7]/)) return { brand: 'Mastercard', color: '#231f20', accent: '#eb001b' };
  if (test(/^3[47]/)) return { brand: 'American Express', color: '#1f7052', accent: '#b7a261' };
  if (test(/^6(011|5)/)) return { brand: 'Discover', color: '#4d4d4d', accent: '#f26522' };
  if (test(/^35(2[89]|[3-8])/)) return { brand: 'JCB', color: '#0e4c92', accent: '#d70f64' };
  if (test(/^(4903|4905|4911|4936|564182|633110|6333|6759)/)) return { brand: 'Maestro', color: '#27272a', accent: '#009ee3' };
  return { brand: null, color: '#1f1b16', accent: '#c9a227' };
}

// Formate le numéro de carte par groupes de 4 (3 pour l'Amex).
function formatCardNumber(value, brand) {
  let digits = value.replace(/\D/g, '').slice(0, 19);
  const amex = brand === 'American Express';
  if (amex) {
    return digits.replace(/(\d{4})(\d{6})(\d{1,5})/, '$1 $2 $3').trim();
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

// Animations avancées de l'étape 3 (paiement par carte) - Framer Motion.
const cardPanelVariants = {
  hidden: { opacity: 0, y: 44, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.09,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: 24,
    scale: 0.98,
    transition: { duration: 0.28, ease: 'easeIn' },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
};

// Sélecteur de champ du numéro de carte (aperçu + saisie).
function CardField({ value, onChange, holder }) {
  const brand = detectCardBrand(value).brand;
  const pretty = value ? formatCardNumber(value, brand) : '';
  return (
    <div className="cc">
      <motion.div className="cc__input-wrap" variants={fadeUpVariants}>
        <label className="cc__label">Numéro de carte</label>
        <input
          className="cc__input"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={pretty}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 19))}
        />
        {brand && <span className={`cc__brand cc__brand--${brand.toLowerCase().replace(/\s/g, '')}`}>{brand}</span>}
      </motion.div>
      <CardPreview number={pretty} brand={brand} holder={holder} />
    </div>
  );
}

// Aperçu stylisé de la carte affiché à côté du champ (design premium).
function CardPreview({ number, brand, holder }) {
  const meta = detectCardBrand(number ? number.replace(/\s/g, '') : '');
  const shown = number || '';
  const display = shown || '•••• •••• •••• ••••';
  const holderDisplay = (holder || '').trim().toUpperCase() || 'TITULAIRE DE VOTRE CARTE';

  return (
    <motion.div
      className="cc__preview"
      variants={{
        hidden: { opacity: 0, y: 26, rotateY: 22, scale: 0.82, filter: 'blur(4px)' },
        show: {
          opacity: 1,
          y: 0,
          rotateY: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: { type: 'spring', stiffness: 150, damping: 17, mass: 0.9 },
        },
      }}
    >
      <div className="cc__gloss" />
      <div className="cc__preview-top">
        <span className="cc__chip" />
        <span className="cc__preview-contactless" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>
      <div className="cc__preview-number">{display}</div>
      <div className="cc__preview-foot">
        <div className="cc__preview-holder">
          <span className="cc__preview-label">Titulaire</span>
          <span className="cc__preview-name">{holderDisplay}</span>
        </div>
        <div className="cc__preview-brand" style={{ color: meta.accent }}>
          {brand || 'BANQUE'}
        </div>
      </div>
    </motion.div>
  );
}

// Formulaire de carte bancaire (numéro + aperçu + expir. + CVC).
// Fonctionne en mode simulé : onPay() crée la commande directement.
function CardForm({ total, processing, onPay }) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holder, setHolder] = useState('');
  const [err, setErr] = useState(null);
  const brand = detectCardBrand(number).brand;

  function formatExpiry(v) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  function handlePay(e) {
    e.preventDefault();
    const digits = number.replace(/\D/g, '');
    const validLen = brand === 'American Express' ? 15 : 16;
    const missing = [];
    if (digits.length < validLen) missing.push('un numéro de carte valide');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) missing.push('la date d’expiration (MM/AA)');
    if (!/^\d{3,4}$/.test(cvc)) missing.push('le code de sécurité (CVC)');
    if (!holder.trim()) missing.push('le nom du titulaire');
    if (missing.length) {
      setErr(`Veuillez renseigner : ${missing.join(', ')}.`);
      return;
    }
    setErr(null);
    onPay(digits);
  }

  return (
    <motion.form
      onSubmit={handlePay}
      className="cc__form"
      noValidate
      variants={cardPanelVariants}
    >
      <CardField value={number} onChange={setNumber} holder={holder} />

      <motion.div className="cc__row" variants={fadeUpVariants}>
        <div className="cc__field cc__field--half">
          <label className="cc__label">Expiration</label>
          <input
            className="cc__input"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
          />
        </div>
        <div className="cc__field cc__field--half">
          <label className="cc__label">CVC</label>
          <input
            className="cc__input"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>
      </motion.div>

      <motion.div className="cc__field" variants={fadeUpVariants}>
        <label className="cc__label">Titulaire de la carte</label>
        <input
          className="cc__input"
          autoComplete="cc-name"
          placeholder="JEAN DUPONT"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
        />
      </motion.div>

      {err && <p className="auth__error">{err}</p>}

      <motion.button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={processing}
        variants={fadeUpVariants}
        whileTap={{ scale: 0.97 }}
      >
        {processing ? 'Traitement en cours...' : `Payer ${total}`}
      </motion.button>
      <motion.p className="cc__secure" variants={fadeUpVariants}>
        Paiement 100 % sécurisé — vos données sont chiffrées
      </motion.p>
    </motion.form>
  );
}

// Formulaire de paiement Stripe (utilisé pour la méthode "Carte")
function StripeForm({ clientSecret, total, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

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
        {processing ? 'Paiement en cours...' : `Payer ${total}`}
      </button>
    </form>
  );
}

// Page de paiement : formulaire de livraison + choix de la méthode de paiement
export default function Checkout() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const shipping = useCartStore(selectCartShipping);
  const count = useCartStore(selectCartCount);
  const clear = useCartStore((state) => state.clear);
  const { format } = useCurrency();

  const location = useLocation();
  const [phase, setPhase] = useState('loading'); // loading | ready | success
  const [mode, setMode] = useState(null); // 'stripe' | 'simulated'
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState(null);
  const [showPayment, setShowPayment] = useState(false); // vrai après validation du formulaire (carte)

  // Formulaire de livraison
  const [form, setForm] = useState(() => ({
    fullName: user?.displayName ?? '',
    email: user?.email ?? '',
    phone: '', // numéro sans indicatif (saisi dans 'dial')
    address: '',
    postalCode: '',
    city: '',
    country: 'TN', // code ISO du pays
    note: '',
  }));
  const [dial, setDial] = useState('+216'); // indicatif téléphonique du pays
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState(null);

  // Méthode de paiement choisie : 'CARD' (carte) | 'CASH' (espèces à la livraison)
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  // Prix selon la méthode de paiement (EUR) :
  // - Carte : même prix (produits + livraison standard)
  // - Espèces : produits + frais de livraison du pays (plus élevé)
  const cashShippingEur = cashShippingFor(form.country);
  const isCash = paymentMethod === 'CASH';
  const displayShippingEur = isCash ? cashShippingEur : shipping;
  const displayTotalEur = subtotal + displayShippingEur;

  const cartItems = items.map((i) => ({ productId: i.id, quantity: i.quantity }));

  // Construit l'objet livraison envoyé au serveur (téléphone avec indicatif).
  function buildShipping() {
    const phone = dial ? `${dial} ${(form.phone || '').trim()}`.trim() : (form.phone || '').trim();
    return { ...form, phone, country: form.country };
  }

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

  // Validation du formulaire de livraison
  function validateForm() {
    const errors = [];
    for (const [key, field] of Object.entries(DELIVERY_FIELDS)) {
      if (field.required && !form[key].trim()) {
        errors.push(`Le champ « ${field.label} » est obligatoire.`);
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.push("L'adresse email n'est pas valide.");
    }
    return errors;
  }

  function handleChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Quand on choisit un pays, on aligne automatiquement l'indicatif téléphonique
    if (name === 'country') {
      const c = lookupCountry(value);
      if (c) setDial(c.dial);
    }
  }

  // Change l'indicatif téléphonique (et aligne éventuellement le pays)
  function handleDialChange(dialValue, countryCode) {
    setDial(dialValue);
    const c = lookupCountry(countryCode);
    if (c) {
      setForm((prev) => ({ ...prev, country: c.code }));
      setTouched((prev) => ({ ...prev, country: true }));
    }
  }

  function isInvalid(name) {
    const field = DELIVERY_FIELDS[name];
    return touched[name] && field.required && !form[name].trim();
  }

  // Prépare le paiement par carte : crée le PaymentIntent puis affiche Stripe.
  async function prepareIntent() {
    setShowPayment(true);
    setPhase('loading');
    setError(null);

    try {
      const data = await createPaymentIntent(token, cartItems, form);
      setMode(data.mode);
      setClientSecret(data.clientSecret);

      if (data.mode === 'stripe' && data.publicKey && data.clientSecret) {
        const stripeInstance = await loadStripe(data.publicKey);
        setStripePromise(stripeInstance);

        // Retour de redirection 3DS : vérifie si le paiement est déjà confirmé
        const result = await stripeInstance.retrievePaymentIntent(data.clientSecret);
        if (result.paymentIntent?.status === 'succeeded') {
          await completeOrder(result.paymentIntent.id);
          return;
        }
      }
      setPhase('ready');
    } catch (err) {
      setError(err.message);
      setPhase('ready');
    }
  }

  // Défilement automatique vers l'étape de paiement (carte) dès qu'elle
  // s'affiche : pas besoin de faire défiler la page à la souris.
  useEffect(() => {
    if (showPayment && paymentMethod === 'CARD') {
      const t = setTimeout(() => {
        document
          .querySelector('.checkout__card--payment')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [showPayment, paymentMethod]);

  // Crée la commande côté serveur puis affiche la confirmation
  async function completeOrder(paymentIntentId = null) {
    setProcessing(true);
    setError(null);
    try {
      const created = await createOrder(token, cartItems, paymentIntentId, {
        shipping: buildShipping(),
        paymentMethod,
      });
      setOrder(created);
      clear();
      setPhase('success');
    } catch (err) {
      setError(err.message);
      setProcessing(false);
      setPhase('ready');
    }
  }

  // Lancement de la commande
  function handleSubmit(e) {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length) {
      setFormError(errors.join(' '));
      setTouched(
        Object.keys(DELIVERY_FIELDS).reduce((acc, key) => ({ ...acc, [key]: true }), {})
      );
      return;
    }

    setFormError(null);
    setError(null);

    if (paymentMethod === 'CASH') {
      // Espèces à la livraison : la commande est créée immédiatement
      completeOrder(null);
    } else {
      // Carte : prépare l'intention de paiement Stripe
      prepareIntent();
    }
  }

  // Mode test sans clés Stripe (carte) : le formulaire de carte valide puis
  // crée la commande directement (aucun vrai débit Stripe).
  function handleSimulatedCardPay() {
    completeOrder(null);
  }

  // ---------- Vue succès ----------
  if (phase === 'success' && order) {
    const isCash = order.paymentMethod === 'CASH';
    return (
      <div className="checkout">
        <div className="checkout__success">
          <h1 className="checkout__title">Merci ! Commande confirmée</h1>
          <p className="checkout__success-text">
            Votre commande <strong>#{order.id.slice(-8).toUpperCase()}</strong> d'un montant de{' '}
            <strong>{format(order.total)}</strong> a bien été enregistrée.
          </p>
          {isCash ? (
            <div className="checkout__success-note">
              <p>
                <strong>Vous avez choisi le paiement en espèces à la livraison.</strong>
              </p>
              <p>
                Préparez <strong>{format(order.total)}</strong> pour la réception de votre commande
                à l'adresse suivante :
              </p>
              <address className="checkout__success-address">
                {order.fullName} — {order.phone}
                <br />
                {order.address}, {order.postalCode} {order.city}
                <br />
                {lookupCountry(order.country)?.name ?? order.country}
              </address>
            </div>
          ) : (
            <p className="checkout__success-payment">
              Paiement par carte bancaire confirmé.
            </p>
          )}
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

  // ---------- Vue formulaire + paiement ----------
  return (
    <div className="checkout">
      <h1 className="checkout__title">Finaliser ma commande</h1>

      <div className="checkout__layout">
        <div className="checkout__form">
          {/* Étape 1 : formulaire de livraison */}
          <form className="checkout__card" onSubmit={handleSubmit} noValidate>
            <h2 className="checkout__section-title">Informations de livraison</h2>

            {formError && <p className="auth__error">{formError}</p>}

            <div className="checkout__grid">
              <div className="checkout__field checkout__field--full">
                <label htmlFor="cv-fullName">{DELIVERY_FIELDS.fullName.label}</label>
                <input
                  id="cv-fullName"
                  type="text"
                  value={form.fullName}
                  placeholder="Ex : Jean Dupont"
                  autoComplete={DELIVERY_FIELDS.fullName.autoComplete}
                  className={isInvalid('fullName') ? 'checkout__invalid' : ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                />
                {isInvalid('fullName') && <span className="checkout__field-err">Obligatoire</span>}
              </div>

              <div className="checkout__field">
                <label htmlFor="cv-email">{DELIVERY_FIELDS.email.label}</label>
                <input
                  id="cv-email"
                  type="email"
                  value={form.email}
                  placeholder="Ex : jean.dupont@mail.com"
                  autoComplete={DELIVERY_FIELDS.email.autoComplete}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>

              <div className="checkout__field checkout__field--full">
                <label htmlFor="cv-phone">{DELIVERY_FIELDS.phone.label}</label>
                <div className="checkout__phone">
                  <select
                    id="cv-dial"
                    className="checkout__dial"
                    value={form.country || 'TN'}
                    onChange={(e) => {
                      const code = e.target.value;
                      const c = lookupCountry(code);
                      handleDialChange(c ? c.dial : '+216', code);
                    }}
                    aria-label="Indicatif du pays"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    id="cv-phone"
                    type="tel"
                    value={form.phone}
                    placeholder="Ex : 20 123 456"
                    autoComplete={DELIVERY_FIELDS.phone.autoComplete}
                    className={isInvalid('phone') ? 'checkout__invalid' : ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
                {isInvalid('phone') && <span className="checkout__field-err">Obligatoire</span>}
              </div>

              <div className="checkout__field checkout__field--full">
                <label htmlFor="cv-address">{DELIVERY_FIELDS.address.label}</label>
                <input
                  id="cv-address"
                  type="text"
                  value={form.address}
                  placeholder="Ex : 12 rue de la Paix"
                  autoComplete={DELIVERY_FIELDS.address.autoComplete}
                  className={isInvalid('address') ? 'checkout__invalid' : ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
                {isInvalid('address') && <span className="checkout__field-err">Obligatoire</span>}
              </div>

              <div className="checkout__field">
                <label htmlFor="cv-postalCode">{DELIVERY_FIELDS.postalCode.label}</label>
                <input
                  id="cv-postalCode"
                  type="text"
                  value={form.postalCode}
                  placeholder="Ex : 1001"
                  autoComplete={DELIVERY_FIELDS.postalCode.autoComplete}
                  className={isInvalid('postalCode') ? 'checkout__invalid' : ''}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                />
                {isInvalid('postalCode') && <span className="checkout__field-err">Obligatoire</span>}
              </div>

              <div className="checkout__field">
                <label htmlFor="cv-city">{DELIVERY_FIELDS.city.label}</label>
                <input
                  id="cv-city"
                  type="text"
                  value={form.city}
                  placeholder="Ex : Tunis"
                  autoComplete={DELIVERY_FIELDS.city.autoComplete}
                  className={isInvalid('city') ? 'checkout__invalid' : ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
                {isInvalid('city') && <span className="checkout__field-err">Obligatoire</span>}
              </div>

              <div className="checkout__field checkout__field--full">
                <label htmlFor="cv-country">{DELIVERY_FIELDS.country.label}</label>
                <select
                  id="cv-country"
                  value={form.country || 'TN'}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className={isInvalid('country') ? 'checkout__invalid' : ''}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                {isInvalid('country') && <span className="checkout__field-err">Obligatoire</span>}
              </div>

              <div className="checkout__field checkout__field--full">
                <label htmlFor="cv-note">Note (optionnel)</label>
                <textarea
                  id="cv-note"
                  value={form.note}
                  placeholder="Instructions de livraison, code d'accès, etc."
                  rows={2}
                  onChange={(e) => handleChange('note', e.target.value)}
                />
              </div>
            </div>

            {/* Étape 2 : choix de la méthode de paiement */}
            <h2 className="checkout__section-title">Méthode de paiement</h2>
            <div className="checkout__methods" role="radiogroup" aria-label="Méthode de paiement">
              <label
                className={`checkout__method ${paymentMethod === 'CARD' ? 'is-active' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CARD"
                  checked={paymentMethod === 'CARD'}
                  onChange={() => setPaymentMethod('CARD')}
                />
                <span className="checkout__method-icon">
                  <CardIcon />
                </span>
                <span className="checkout__method-body">
                  <strong>Carte bancaire</strong>
                  <span>Payez en ligne de façon sécurisée (Visa, Mastercard, Amex…)</span>
                </span>
              </label>

              <label
                className={`checkout__method ${paymentMethod === 'CASH' ? 'is-active' : ''}`}
                onClick={() => setPaymentMethod('CASH')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                />
                <span className="checkout__method-icon">
                  <CashIcon />
                </span>
                <span className="checkout__method-body">
                  <strong>Espèces à la livraison</strong>
                  <span>
                    Payez en espèces à la réception. Frais de livraison{' '}
                    {lookupCountry(form.country)?.name ?? 'du pays'} :{' '}
                    <strong>{format(cashShippingEur)}</strong>.
                  </span>
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn--primary btn--block checkout__submit" disabled={processing}>
              {processing
                ? 'Traitement...'
                : paymentMethod === 'CASH'
                  ? `Commander et payer à la livraison — ${format(displayTotalEur)}`
                  : `Continuer vers le paiement — ${format(displayTotalEur)}`}
            </button>
          </form>

          {/* Étape 3 : paiement bancaire (après validation du formulaire) */}
          {/* Apparaît avec une animation avancée : panneau qui glisse vers le haut,
              champs qui s'enchaînent et carte qui pivote en 3D à l'entrée. */}
          <AnimatePresence initial={false}>
            {showPayment && paymentMethod === 'CARD' && (phase === 'loading' || phase === 'ready') && (
              <motion.div
                key="card-payment"
                className="checkout__card checkout__card--payment"
                variants={cardPanelVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.h2 className="checkout__section-title" variants={fadeUpVariants}>
                  Paiement par carte
                </motion.h2>
                {phase === 'loading' && !error && (
                  <motion.p className="home__message" variants={fadeUpVariants}>
                    Préparation du paiement...
                  </motion.p>
                )}
                {error && <p className="auth__error">{error}</p>}

                {mode === 'stripe' && stripePromise && clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeForm
                      total={format(displayTotalEur)}
                      onSuccess={(intentId) => completeOrder(intentId)}
                      onError={setError}
                    />
                  </Elements>
                )}

                {mode === 'simulated' && (
                  <motion.div className="checkout__simulated" variants={fadeUpVariants}>
                    <p className="checkout__sim-note">
                      Mode test : aucune clé Stripe configurée. Le paiement est simulé. Activez vos
                      clés Stripe dans <code>server/.env</code> pour activer le vrai paiement.
                    </p>
                    <CardForm
                      total={format(displayTotalEur)}
                      processing={processing}
                      onPay={handleSimulatedCardPay}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="checkout__summary">
          <h2 className="checkout__summary-title">Résumé ({count} article{count > 1 ? 's' : ''})</h2>
          {items.map((item) => (
            <div className="checkout__line" key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{format(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="checkout__line">
            <span>Sous-total</span>
            <span>{format(subtotal)}</span>
          </div>
          <div className="checkout__line">
            <span>Livraison {isCash ? `(${lookupCountry(form.country)?.name ?? ''})` : ''}</span>
            <span>{displayShippingEur === 0 ? 'Offerte' : format(displayShippingEur)}</span>
          </div>
          <div className="checkout__line">
            <span>Paiement</span>
            <span>{isCash ? 'Espèces' : 'Carte'}</span>
          </div>
          <div className="checkout__line checkout__line--total">
            <strong>Total</strong>
            <strong>{format(displayTotalEur)}</strong>
          </div>
          <Link to="/cart" className="checkout__back">
            ← Retour au panier
          </Link>
        </div>
      </div>
    </div>
  );
}
