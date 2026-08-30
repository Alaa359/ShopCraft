import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
} from '../../api/client.js';

// Formulaire vide utilisé pour la création
const EMPTY_FORM = {
  name: '',
  category: '',
  price: '',
  stock: '',
  description: '',
  images: [],
};

// Page admin : CRUD complet des produits + upload d'images
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
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Upload une image puis l'ajoute à la liste du formulaire
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const { url } = await uploadImage(token, file);
      setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // permet de re-sélectionner le même fichier
    }
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

  async function handleDelete(product) {
    if (!window.confirm(`Supprimer définitivement "${product.name}" ?`)) return;
    setError(null);
    try {
      await deleteProduct(token, product.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Produits</h1>
        <button className="btn btn--primary" onClick={startCreate}>
          + Nouveau produit
        </button>
      </header>

      {error && <p className="auth__error">{error}</p>}
      {loading && <p className="home__message">Chargement des produits...</p>}

      {editing && (
        <form className="admin__form" onSubmit={handleSubmit}>
          <h2 className="admin__subtitle">
            {editing === 'new' ? 'Nouveau produit' : 'Modifier le produit'}
          </h2>

          {formError && <p className="auth__error">{formError}</p>}

          <div className="admin__form-grid">
            <label className="admin__field">
              Nom
              <input name="name" value={form.name} onChange={handleChange} placeholder="Nom du produit" />
            </label>

            <label className="admin__field">
              Catégorie
              <input name="category" value={form.category} onChange={handleChange} placeholder="Ex. Électronique" />
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
            <label className="admin__upload">
              {uploading ? 'Envoi en cours...' : 'Ajouter une image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={uploading}
              />
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
      )}

      {!loading && products.length > 0 && (
        <table className="admin__table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="admin__product">
                    {product.images?.[0] ? (
                      <img className="admin__thumb" src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="admin__thumb admin__thumb--empty" />
                    )}
                    <span>{product.name}</span>
                  </div>
                </td>
                <td>{product.category}</td>
                <td>{Number(product.price).toFixed(2)} €</td>
                <td>
                  <span
                    className={
                      product.stock > 0 ? 'admin__stock admin__stock--ok' : 'admin__stock admin__stock--out'
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td>
                  <div className="admin__row-actions">
                    <button className="btn btn--small" onClick={() => startEdit(product)}>
                      Modifier
                    </button>
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(product)}>
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && products.length === 0 && (
        <p className="home__message">Aucun produit. Créez en un avec « + Nouveau produit ».</p>
      )}
    </div>
  );
}