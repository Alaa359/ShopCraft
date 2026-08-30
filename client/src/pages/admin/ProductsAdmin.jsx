import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useAdminSearch } from '../../components/AdminLayout.jsx';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
} from '../../api/client.js';
import RatingStars from '../../components/RatingStars.jsx';

// Formulaire vide utilisé pour la création
const EMPTY_FORM = {
  name: '',
  category: '',
  price: '',
  stock: '',
  description: '',
  images: [],
};

// Seuil en dessous duquel le stock est signalé comme faible
const LOW_STOCK_THRESHOLD = 5;

// Icônes d'actions (style outline, héritent de la couleur courante)
function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17zM13.5 6.5l3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Lignes de squelette pendant le chargement du tableau
function TableSkeleton() {
  return (
    <table className="admin__table admin__table--skeleton">
      <thead>
        <tr>
          {['Image', 'Nom', 'Catégorie', 'Prix', 'Stock', 'Note', 'Actions'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }).map((_, row) => (
          <tr key={row}>
            {Array.from({ length: 7 }).map((__, col) => (
              <td key={col}>
                <div
                  className="skeleton__block"
                  style={{ height: col === 0 ? 40 : 16, width: col === 0 ? 40 : '80%' }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Page admin : CRUD complet des produits + upload d'images (drag & drop)
export default function ProductsAdmin() {
  const token = useAuthStore((state) => state.token);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulaire : false = masqué, "new" = création, sinon objet produit en édition
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Produit en attente de confirmation de suppression (modal)
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    getProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  function startCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  }

  function startEdit(product) {
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      description: product.description,
      images: Array.isArray(product.images) ? product.images : [],
    });
    setFormError(null);
    setEditing(product.id);
  }

  function cancel() {
    setEditing(false);
    setFormError(null);
    setDragging(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Upload un fichier puis l'ajoute à la liste du formulaire
  async function uploadFile(file) {
    setUploading(true);
    setFormError(null);
    try {
      const { url } = await uploadImage(token, file);
      setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // Depuis le sélecteur de fichier classique
  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    await uploadFile(file);
  }

  function removeImage(url) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((i) => i !== url) }));
  }

  // Validation + envoi (création ou mise à jour)
  async function handleSubmit(e) {
    e.preventDefault();
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);

    if (!form.name.trim() || !form.category.trim() || !form.description.trim()) {
      return setFormError('Nom, catégorie et description sont obligatoires.');
    }
    if (Number.isNaN(price) || price <= 0) {
      return setFormError('Prix invalide (nombre strictement positif).');
    }
    if (Number.isNaN(stock) || stock < 0) {
      return setFormError('Stock invalide (entier positif ou nul).');
    }

    setSaving(true);
    setFormError(null);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price,
        stock,
        images: form.images,
      };
      if (editing === 'new') {
        await createProduct(token, data);
      } else {
        await updateProduct(token, editing, data);
      }
      setEditing(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Suppression réelle, déclenchée depuis la modal de confirmation
  async function handleDelete(product) {
    setConfirm(null);
    setError(null);
    try {
      await deleteProduct(token, product.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const outOfStock = (product) => product.stock <= 0;
  const lowStock = (product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;

  // Recherche du bandeau admin : filtre client-side nom + catégorie
  const { search } = useAdminSearch();
  const query = search.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      query
        ? products.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.category.toLowerCase().includes(query)
          )
        : products,
    [products, query]
  );

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Produits</h1>
        <button className="btn btn--primary" onClick={startCreate}>
          + Ajouter un produit
        </button>
      </header>

      {error && <p className="auth__error">{error}</p>}
      {loading && (
        <section className="admin__panel">
          <div className="admin__table-wrap">
            <TableSkeleton />
          </div>
        </section>
      )}

      {!loading && products.length === 0 && (
        <div className="admin__panel">
          <p className="home__message">Aucun produit. Créez en un avec « + Ajouter un produit ».</p>
        </div>
      )}

      {!loading && products.length > 0 && visibleProducts.length === 0 && (
        <div className="admin__panel">
          <p className="home__message">Aucun produit ne correspond à « {search.trim()} ».</p>
        </div>
      )}

      {!loading && products.length > 0 && visibleProducts.length > 0 && (
        <section className="admin__panel">
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.images?.[0] ? (
                        <img className="admin__thumb" src={product.images[0]} alt={product.name} />
                      ) : (
                        <div className="admin__thumb admin__thumb--empty" />
                      )}
                    </td>
                    <td>
                      <span className="admin__product-name">{product.name}</span>
                    </td>
                    <td>{product.category}</td>
                    <td>{Number(product.price).toFixed(2)} €</td>
                    <td>
                      <span
                        className={`admin__stock ${
                          outOfStock(product)
                            ? 'admin__stock--out'
                            : lowStock(product)
                              ? 'admin__stock--low'
                              : 'admin__stock--ok'
                        }`}
                      >
                        {outOfStock(product) ? 'Rupture' : product.stock}
                      </span>
                    </td>
                    <td>
                      <div className="admin__note">
                        <RatingStars value={product.avgRating ?? 0} size="sm" />
                        <span className="admin__note-text">
                          {product.reviewCount ? `${product.avgRating?.toFixed(1)} · ${product.reviewCount} avis` : '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin__row-actions">
                        <button
                          type="button"
                          className="admin__icon-btn"
                          onClick={() => startEdit(product)}
                          title="Modifier"
                          aria-label={`Modifier ${product.name}`}
                        >
                          <IconPencil />
                        </button>
                        <button
                          type="button"
                          className="admin__icon-btn admin__icon-btn--danger"
                          onClick={() => setConfirm(product)}
                          title="Supprimer"
                          aria-label={`Supprimer ${product.name}`}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Modal création / édition ---------- */}
      {editing && (
        <div className="modal-overlay" onMouseDown={cancel}>
          <div
            className="modal modal--wide"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal__head">
              <h2 className="modal__title">
                {editing === 'new' ? 'Nouveau produit' : 'Modifier le produit'}
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={cancel}
                aria-label="Fermer"
              >
                ✕
              </button>
            </header>

            <form className="admin__form modal__form" onSubmit={handleSubmit}>
              {formError && <p className="auth__error">{formError}</p>}

              <div className="admin__form-grid">
                <label className="admin__field">
                  Nom
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Nom du produit" />
                </label>

                <label className="admin__field">
                  Catégorie
                  <input name="category" value={form.category} onChange={handleChange} placeholder="Ex. Vêtements" />
                </label>

                <label className="admin__field">
                  Prix (€)
                  <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} />
                </label>

                <label className="admin__field">
                  Stock
                  <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} />
                </label>
              </div>

              <label className="admin__field">
                Description
                <textarea
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Description du produit"
                />
              </label>

              <div className="admin__field">
                Images
                {/* Zone de dépôt : clic = parcourir, glisser-déposer = upload direct */}
                <label
                  className={`admin__dropzone ${dragging ? 'is-dragging' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) await uploadFile(file);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    disabled={uploading}
                  />
                  <span className="admin__dropzone-title">
                    {uploading
                      ? 'Envoi en cours...'
                      : 'Glissez une image ici, ou cliquez pour parcourir'}
                  </span>
                  <span className="admin__dropzone-hint">JPEG, PNG, WEBP ou GIF — 5 Mo max</span>
                </label>
                {form.images.length > 0 && (
                  <div className="admin__previews">
                    {form.images.map((url) => (
                      <div className="admin__preview" key={url}>
                        <img src={url} alt="" />
                        <button type="button" onClick={() => removeImage(url)} title="Retirer">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin__form-actions">
                <button type="submit" className="btn btn--primary" disabled={saving || uploading}>
                  {saving ? 'Enregistrement...' : editing === 'new' ? 'Créer' : 'Enregistrer'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={cancel}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Modal de confirmation de suppression ---------- */}
      {confirm && (
        <div className="modal-overlay" onMouseDown={() => setConfirm(null)}>
          <div
            className="modal modal--sm"
            onMouseDown={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <h2 className="modal__title">Supprimer ce produit ?</h2>
            <p className="modal__text">
              « {confirm.name} » sera définitivement retiré du catalogue. Cette action est
              irréversible.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => handleDelete(confirm)}
              >
                Supprimer
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}