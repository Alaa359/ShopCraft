import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct, addReview, updateReview, deleteReview } from '../api/client.js';
import { useCartStore } from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';

// Pastille d'étoiles en lecture seule
function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} étoile(s) sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`stars__item ${i <= value ? 'stars__item--on' : ''}`}>
          ★
        </span>
      ))}
    </span>
  );
}

// Sélecteur de note interactif (1 à 5 étoiles)
function StarPicker({ value, onChange }) {
  return (
    <div className="stars stars--pick">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={`stars__item ${i <= value ? 'stars__item--on' : ''}`}
          onClick={() => onChange(i)}
          aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Masque partiellement l'email de l'auteur (ex. j***@mail.com)
function maskEmail(email = '') {
  const at = email.indexOf('@');
  if (at <= 1) return email;
  return `${email[0]}${'*'.repeat(at - 1)}${email.slice(at)}`;
}

// Image principale du produit (ou placeholder)
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

// Fiche produit détaillée + avis clients
export default function ProductPage() {
  const { id } = useParams();
  const token = useAuthStore((state) => state.token);
  const authUser = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

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

  if (loading) return <p className="home__message">Chargement du produit...</p>;

  if (error)
    return (
      <div className="home__message home__message--error">
        <p>Erreur : {error}</p>
        <Link to="/">← Retour au catalogue</Link>
      </div>
    );

  const price = Number(product.price).toFixed(2);
  const outOfStock = product.stock <= 0;

  // Calculs sur les avis
  const reviews = product.reviews ?? [];
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const myReview = authUser ? reviews.find((r) => r.user?.id === authUser.id) : null;
  const showForm = myReview ? Boolean(editingId) : true;

  // Ajoute le produit au panier et affiche un retour visuel
  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
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
          <p className="product__price">{price} €</p>

          {reviews.length > 0 && (
            <div className="product__rating">
              <Stars value={Math.round(average)} />
              <span>
                {average.toFixed(1)} / 5 ({reviews.length} avis)
              </span>
            </div>
          )}

          <p className="product__description">{product.description}</p>

          <p className={`product__stock ${outOfStock ? 'product__stock--out' : ''}`}>
            {outOfStock ? 'Rupture de stock' : `${product.stock} disponible(s)`}
          </p>

          {/* Ajout au panier (store Zustand) */}
          <button
            className={`product__add ${added ? 'product__add--added' : ''}`}
            onClick={handleAdd}
            disabled={outOfStock}
          >
            {added ? 'Ajouté ✓' : outOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
          </button>
        </div>
      </div>

      {/* ---------- Section avis ---------- */}
      <section className="reviews">
        <h2 className="reviews__title">
          Avis <span className="reviews__count">({reviews.length})</span>
        </h2>

        {reviews.length > 0 && (
          <div className="reviews__summary">
            <Stars value={Math.round(average)} />
            <span className="reviews__average">{average.toFixed(1)} / 5</span>
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
                  <button type="button" className="btn btn--ghost" onClick={resetForm} disabled={saving}>
                    Annuler
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="reviews__mine">
              <p className="reviews__mine-text">
                Vous avez noté ce produit : <Stars value={myReview.rating} />
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
          <p className="home__message reviews__empty">
            Aucun avis pour le moment. Soyez le premier à donner votre avis !
          </p>
        ) : (
          <ul className="reviews__list">
            {reviews.map((review) => (
              <li className="review" key={review.id}>
                <div className="review__head">
                  <Stars value={review.rating} />
                  <span className="review__author">{maskEmail(review.user?.email)}</span>
                  <span className="review__date">
                    {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="review__comment">{review.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}