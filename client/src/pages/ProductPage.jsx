import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct, addReview, updateReview, deleteReview } from '../api/client.js';
import { useCartStore } from '../store/cartStore.js';
import { useUiStore } from '../store/uiStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useCurrency } from '../lib/useCurrency.js';
import RatingStars from '../components/RatingStars.jsx';

// Sélecteur de note interactif (1 à 5 étoiles) avec prévisualisation au survol
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const active = hover ?? value; // survol prioritaire pour la prévisualisation

  return (
    <div
      className="stars stars--pick"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={`stars__item ${i <= active ? 'stars__item--on' : ''}`}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Masque partiellement l'email de l'auteur (ex. j***@mail.com) + initiale d'avatar
function maskEmail(email = '') {
  const at = email.indexOf('@');
  if (at <= 1) return email;
  return `${email[0]}${'*'.repeat(at - 1)}${email.slice(at)}`;
}
function avatarInitial(email = '') {
  return (email[0] || '?').toUpperCase();
}

// Galerie : image principale + miniatures
function ProductGallery({ images, name }) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return <div className="gallery gallery--placeholder">ShopCraft</div>;
  }

  return (
    <div className="gallery">
      <img className="gallery__main" src={images[active]} alt={name} />
      {images.length > 1 && (
        <div className="gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={i}
              className={`gallery__thumb ${i === active ? 'gallery__thumb--active' : ''}`}
              onClick={() => setActive(i)}
            >
              <img src={img} alt={`${name} - visuel ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fiche produit détaillée : galerie + infos, onglets Description / Avis
export default function ProductPage() {
  const { id } = useParams();
  const token = useAuthStore((state) => state.token);
  const authUser = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useUiStore((state) => state.showToast);
  const currency = useCurrency();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');

  // État du formulaire d'avis
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQty(1);
    setTab('description');

    getProduct(id)
      .then((data) => !cancelled && setProduct(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Recharge le produit (après ajout/modification/suppression d'un avis)
  function refresh() {
    return getProduct(id).then(setProduct).catch((err) => setReviewError(err.message));
  }

  // Réinitialise le formulaire d'avis
  function resetForm() {
    setRating(null);
    setComment('');
    setEditingId(null);
    setReviewError(null);
  }

  // Passe le formulaire en mode "modification" pré-rempli
  function startEdit(myReview) {
    setRating(myReview.rating);
    setComment(myReview.comment);
    setEditingId(myReview.id);
    setReviewError(null);
    setTab('avis');
  }

  // Ajoute ou modifie un avis
  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) return setReviewError('Choisissez une note (1 à 5 étoiles).');
    if (!comment.trim()) return setReviewError('Écrivez un commentaire.');

    setSaving(true);
    setReviewError(null);
    try {
      if (editingId) {
        await updateReview(token, editingId, { rating, comment });
      } else {
        await addReview(token, { productId: id, rating, comment });
      }
      resetForm();
      await refresh();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Supprime son propre avis
  async function handleDelete(myReview) {
    if (!window.confirm('Supprimer votre avis sur ce produit ?')) return;
    setSaving(true);
    setReviewError(null);
    try {
      await deleteReview(token, myReview.id);
      resetForm();
      await refresh();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="catalogue__message">Chargement du produit...</p>;

  if (error)
    return (
      <div className="catalogue__message catalogue__message--error">
        <p>Erreur : {error}</p>
        <p>
          <Link to="/">← Retour au catalogue</Link>
        </p>
      </div>
    );

  const price = currency.format(product.price);
  const outOfStock = product.stock <= 0;

  // Calculs sur les avis
  const reviews = product.reviews ?? [];
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Répartition par note (5 → 1) en pourcentage pour les barres
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    if (counts[r.rating] !== undefined) counts[r.rating] += 1;
  });
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: counts[star],
    percent: reviews.length ? Math.round((counts[star] / reviews.length) * 100) : 0,
  }));

  const myReview = authUser ? reviews.find((r) => r.user?.id === authUser.id) : null;
  const showForm = myReview ? Boolean(editingId) : true;

  // Ajoute le produit (quantité choisie) au panier + notification
  function handleAdd() {
    addItem(product, qty);
    showToast(`${qty} × ${product.name} ajouté au panier`);
  }

  // Ouvre un onglet et, pour les avis, fait défiler jusqu'à la section
  function showAvis() {
    setTab('avis');
    requestAnimationFrame(() => {
      document
        .querySelector('.product__tabs')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="product">
      <Link to="/" className="product__back">
        ← Retour au catalogue
      </Link>

      <div className="product__layout">
        <ProductGallery images={product.images} name={product.name} />

        <div className="product__info">
          <span className="product__category">{product.category}</span>
          <h1 className="product__name">{product.name}</h1>

          {reviews.length > 0 ? (
            <button type="button" className="product__rating" onClick={showAvis}>
              <RatingStars value={average} size="md" />
              <span>
                {average.toFixed(1)} / 5 ({reviews.length} avis)
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="product__rating product__rating--empty"
              onClick={showAvis}
            >
              Aucun avis — soyez le premier à donner votre avis !
            </button>
          )}

          <p className="product__price">{price}</p>

          <p className={`product__stock ${outOfStock ? 'product__stock--out' : ''}`}>
            {outOfStock ? 'Rupture de stock' : `${product.stock} disponible(s)`}
          </p>

          {/* Quantité + ajout au panier */}
          <div className="product__buy">
            <div className="qty">
              <button
                type="button"
                className="qty__btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={outOfStock}
                aria-label="Diminuer la quantité"
              >
                −
              </button>
              <span className="qty__value" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                className="qty__btn"
                onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                disabled={outOfStock || qty >= product.stock}
                aria-label="Augmenter la quantité"
              >
                +
              </button>
            </div>

            <button
              className="btn btn--primary product__add"
              onClick={handleAdd}
              disabled={outOfStock}
            >
              {outOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Onglets Description / Avis ---------- */}
      <div className="product__tabs">
        <div className="tabs__nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'description'}
            className={`tabs__tab ${tab === 'description' ? 'is-active' : ''}`}
            onClick={() => setTab('description')}
          >
            Description
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'avis'}
            className={`tabs__tab ${tab === 'avis' ? 'is-active' : ''}`}
            onClick={showAvis}
          >
            Avis ({reviews.length})
          </button>
        </div>

        {tab === 'description' ? (
          <div className="tab__panel">
            <p className="tab__text">{product.description}</p>
          </div>
        ) : (
          <div className="tab__panel">
            {/* ---------- Section avis ---------- */}
            <section className="reviews">
              {reviews.length > 0 && (
                <div className="reviews__summary">
                  {/* Note moyenne en grand chiffre + étoiles */}
                  <div className="reviews__score">
                    <span className="reviews__score-num">{average.toFixed(1)}</span>
                    <RatingStars value={average} size="lg" />
                    <span className="reviews__score-count">
                      sur {reviews.length} avis
                    </span>
                  </div>

                  {/* Barres de répartition par étoile */}
                  <div className="reviews__bars">
                    {distribution.map(({ star, count, percent }) => (
                      <div className="reviews__bar-row" key={star}>
                        <span className="reviews__bar-label">{star}★</span>
                        <div
                          className="reviews__bar"
                          role="progressbar"
                          aria-label={`${percent} % d'avis ${star} étoile(s)`}
                          aria-valuenow={percent}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div
                            className="reviews__bar-fill"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="reviews__bar-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {token ? (
                showForm ? (
                  <form className="reviews__form" onSubmit={handleSubmit}>
                    <h3 className="reviews__form-title">
                      {editingId ? 'Modifier votre avis' : 'Laisser un avis'}
                    </h3>
                    {reviewError && <p className="auth__error">{reviewError}</p>}

                    <div className="reviews__field">
                      <span className="reviews__label">Votre note</span>
                      <StarPicker value={rating || 0} onChange={setRating} />
                    </div>

                    <label className="reviews__field">
                      <span className="reviews__label">Votre commentaire</span>
                      <textarea
                        rows="3"
                        maxLength="500"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Partagez votre expérience avec ce produit..."
                      />
                    </label>

                    <div className="reviews__actions">
                      <button type="submit" className="btn btn--primary" disabled={saving}>
                        {saving ? 'Envoi...' : editingId ? 'Enregistrer' : 'Publier mon avis'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={resetForm}
                          disabled={saving}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="reviews__mine">
                    <p className="reviews__mine-text">
                      Vous avez noté ce produit :{' '}
                      <RatingStars value={myReview.rating} size="sm" />
                    </p>
                    <div className="reviews__actions">
                      <button className="btn btn--primary" onClick={() => startEdit(myReview)}>
                        Modifier mon avis
                      </button>
                      <button
                        className="btn btn--ghost"
                        onClick={() => handleDelete(myReview)}
                        disabled={saving}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <p className="reviews__login">
                  <Link to="/login">Connectez-vous</Link> pour laisser un avis.
                </p>
              )}

              {reviews.length === 0 ? (
                <p className="catalogue__message reviews__empty">
                  Aucun avis pour le moment. Soyez le premier à donner votre avis !
                </p>
              ) : (
                <ul className="reviews__list">
                  {reviews.map((review) => (
                    <li className="review" key={review.id}>
                      <div className="review__head">
                        {/* Avatar : initiale de l'auteur */}
                        <span className="review__avatar">
                          {avatarInitial(review.user?.email)}
                        </span>
                        <span className="review__author">
                          {maskEmail(review.user?.email)}
                        </span>
                        <span className="review__date">
                          {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="review__meta">
                        <RatingStars value={review.rating} size="sm" />
                        <span className="review__rating-label">{review.rating}/5</span>
                      </div>
                      <p className="review__comment">{review.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}