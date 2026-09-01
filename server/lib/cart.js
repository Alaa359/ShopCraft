import { prisma } from './prisma.js';

// Erreur métier du panier (convertie en HTTP 400 par les routes)
export class CartError extends Error {}

// Frais de livraison : offerts dès un certain montant, sinon tarif fixe.
// Doit rester aligné sur client/src/store/cartStore.js.
export const SHIPPING_FEE = 4.9;
export const FREE_SHIPPING_THRESHOLD = 100;

function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
}

// Reconstruit le panier depuis la base de données.
// Les prix sont TOUJOURS calculés côté serveur (jamais ceux du client).
// items = [{ productId, quantity }]
export async function buildCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CartError('Le panier est vide');
  }

  // Regroupe les quantités par produit (et valide le format)
  const quantities = items.reduce((acc, item) => {
    const id = item?.productId;
    const qty = Math.floor(Number(item?.quantity));
    if (!id || !(qty > 0)) {
      throw new CartError('Article invalide dans le panier');
    }
    acc[id] = (acc[id] || 0) + qty;
    return acc;
  }, {});

  const productIds = Object.keys(quantities);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    throw new CartError('Certains produits sont introuvables');
  }

  const lines = [];
  let subtotal = 0;

  for (const product of products) {
    const quantity = quantities[product.id];
    if (product.stock < quantity) {
      throw new CartError(`Stock insuffisant pour "${product.name}"`);
    }
    const price = Number(product.price);
    lines.push({ productId: product.id, quantity, price });
    subtotal += price * quantity;
  }

  const shipping = shippingFor(subtotal);
  return {
    lines,
    subtotal,
    shipping,
    total: subtotal + shipping, // total payé (produits + livraison)
    productIds,
  };
}

// Obtient un panier en convertissant les erreurs métier (CartError) en
// réponse HTTP 400. Toute autre erreur (DB, etc.) est relancée telle quelle.
// Usage dans une route : const cart = await tryBuildCart(items, res);
// Renvoie le panier, ou undefined si une réponse 400 a déjà été envoyée.
export async function tryBuildCart(items, res) {
  try {
    return await buildCart(items);
  } catch (err) {
    if (err instanceof CartError) {
      res.status(400).json({ error: err.message });
      return undefined;
    }
    throw err;
  }
}