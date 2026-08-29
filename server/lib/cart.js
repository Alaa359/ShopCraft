import { prisma } from './prisma.js';

// Erreur métier du panier (convertie en HTTP 400 par les routes)
export class CartError extends Error {}

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
  let total = 0;

  for (const product of products) {
    const quantity = quantities[product.id];
    if (product.stock < quantity) {
      throw new CartError(`Stock insuffisant pour "${product.name}"`);
    }
    const price = Number(product.price);
    lines.push({ productId: product.id, quantity, price });
    total += price * quantity;
  }

  return { lines, total, productIds };
}