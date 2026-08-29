// URL de base de l'API (en dev, proxy Vite -> localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Requête générique vers l'API avec gestion des erreurs
async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
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

// ---------- Authentification ----------

// Enregistre un nouveau compte utilisateur
export function register(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Connecte un utilisateur (renvoie { token, user })
export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Récupère le profil de l'utilisateur connecté
export function getMe(token) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------- Commandes & Paiement ----------

// Prépare le paiement d'un panier (renvoie { clientSecret, mode, total, publicKey })
export function createPaymentIntent(token, items) {
  return request('/payments/create-intent', {
    method: 'POST',
    body: JSON.stringify({ items }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Crée la commande après paiement (paymentIntentId optionnel)
export function createOrder(token, items, paymentIntentId = null) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({ items, paymentIntentId }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Historique des commandes de l'utilisateur connecté
export function getMyOrders(token) {
  return request('/orders/mine', {
    headers: { Authorization: `Bearer ${token}` },
  });
}