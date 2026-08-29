// URL de base de l'API (en dev, proxy Vite -> localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Requête générique vers l'API avec gestion des erreurs
async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur serveur (${res.status})`);
  }
  return res.json();
}

// Récupère la liste des produits avec filtres optionnels
// params : { category, search, minPrice, maxPrice }
export function getProducts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, value);
    }
  });
  const query = qs.toString();
  return request(`/products${query ? `?${query}` : ''}`);
}

// Récupère le détail d'un produit (avec ses avis)
export function getProduct(id) {
  return request(`/products/${id}`);
}