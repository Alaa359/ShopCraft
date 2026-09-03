// URL de base de l'API (en dev, proxy Vite -> localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Requête générique vers l'API avec gestion des erreurs
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    // Erreur réseau : serveur down, CORS, hors-ligne...
    throw new Error("Impossible de contacter le serveur. Vérifiez que l'API est démarrée.");
  }

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

// ---------- Produits (admin) ----------

// Crée un produit (admin). data : { name, description, price, stock, category, images }
export function createProduct(token, data) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Met à jour un produit (admin)
export function updateProduct(token, id, data) {
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Supprime un produit (admin)
export function deleteProduct(token, id) {
  return request(`/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Upload d'un fichier vers un endpoint d'upload (multipart/form-data).
// Retourne { url }.
async function uploadFile(token, path, file) {
  const formData = new FormData();
  formData.append('image', file);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new Error("Impossible de contacter le serveur. Vérifiez que l'API est démarrée.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur upload (${res.status})`);
  }
  return res.json();
}

// Upload d'une image (admin). Retourne { url }.
export async function uploadImage(token, file) {
  return uploadFile(token, '/upload/image', file);
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

// Connexion / inscription via Google (renvoie { token, user }).
// idToken : token d'ID Google obtenu par le bouton "Continuer avec Google".
export function googleLogin(idToken) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

// Récupère le profil de l'utilisateur connecté
export function getMe(token) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Met à jour le profil : data : { displayName?, avatar? }
export function updateMe(token, data) {
  return request('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Upload de la photo de profil (tout utilisateur connecté). Retourne { url }.
export async function uploadAvatar(token, file) {
  return uploadFile(token, '/upload/avatar', file);
}

// ---------- Commandes & Paiement ----------

// Prépare le paiement d'un panier (renvoie { clientSecret, mode, total, publicKey })
// data : { items, shipping }
export function createPaymentIntent(token, items, shipping = {}) {
  return request('/payments/create-intent', {
    method: 'POST',
    body: JSON.stringify({ items, shipping }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Crée la commande après paiement.
// data : { items, shipping, paymentMethod (CARD|CASH), paymentIntentId? }
export function createOrder(token, items, paymentIntentId = null, meta = {}) {
  const { shipping = {}, paymentMethod = 'CARD' } = meta;
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({ items, shipping, paymentMethod, paymentIntentId }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Historique des commandes de l'utilisateur connecté
export function getMyOrders(token) {
  return request('/orders/mine', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------- Avis produits ----------

// Ajoute un avis (note 1-5 + commentaire). data : { productId, rating, comment }
export function addReview(token, data) {
  return request('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Modifie son propre avis. data : { rating?, comment? }
export function updateReview(token, id, data) {
  return request(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Supprime son propre avis
export function deleteReview(token, id) {
  return request(`/reviews/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------- Administration ----------

// Liste toutes les commandes (admin), filtre optionnel ?status=
export function getAllOrders(token, status = '') {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/orders${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Change le statut d'une commande (admin)
export function updateOrderStatus(token, id, status) {
  return request(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Statistiques du dashboard (admin)
export function getStats(token) {
  return request('/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------- Support (aide) & Notifications ----------

// L'utilisateur envoie un problème. data : { subject, message }
export function createTicket(token, data) {
  return request('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Tickets de l'utilisateur connecté
export function getMyTickets(token) {
  return request('/support/tickets/mine', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Tous les tickets (admin)
export function getAllTickets(token) {
  return request('/support/tickets', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Détail d'un ticket (propriétaire ou admin)
export function getTicket(token, id) {
  return request(`/support/tickets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Répond à un ticket. body : { message }
export function replyTicket(token, id, message) {
  return request(`/support/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Notifications de l'utilisateur connecté (renvoie { items, unreadCount })
export function getNotifications(token) {
  return request('/support/notifications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Marque toutes les notifications comme lues (ou une seule si { id })
export function markNotificationsRead(token, id = null) {
  return request('/support/notifications/read', {
    method: 'PUT',
    body: JSON.stringify({ ...(id ? { id } : {}) }),
    headers: { Authorization: `Bearer ${token}` },
  });
}