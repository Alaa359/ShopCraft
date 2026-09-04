// Réponses automatiques (bot) du chat de support.
//
// Le bot répond au client quand aucun administrateur n'est engagé dans la
// conversation. Pour éviter les boucles, il ne répond que si le DERNIER message
// de la room appartient au client (c'est-à-dire que personne d'autre n'a pris
// la main). Dès qu'un admin intervient (message admin), le bot se tait.
//
// Le bot est un utilisateur réel en base, identifiable par son email unique
// chatbot@shopcraft.local, afin que ses messages soient persistés et affichés
// comme ceux d'un agent.
import { prisma } from '../lib/prisma.js';

const BOT_EMAIL = 'chatbot@shopcraft.local';
const BOT_NAME = 'Assistance ShopCraft';

// Récupère (ou crée) l'utilisateur système du bot.
export async function getSystemBot() {
  const existing = await prisma.user.findUnique({ where: { email: BOT_EMAIL } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email: BOT_EMAIL,
      role: 'ADMIN',
      displayName: BOT_NAME,
      provider: 'local',
    },
  });
}

// Règles FAQ par mots-clés. La première règle dont un mot-clé est trouvé
// dans le message (minuscules, insensible aux accents approx) gagne.
const RULES = [
  {
    keywords: ['bonjour', 'salut', 'hello', 'coucou', 'bonsoir', 'hey'],
    reply:
      "Bonjour ! 👋 Je suis l'assistant ShopCraft. Comment puis-je vous aider ? (commandes, livraison, retours, paiement, produit...)",
  },
  {
    keywords: ['rembourser', 'remboursement', 'rembours'],
    reply:
      "Pour un remboursement, votre commande doit être retournée dans son état d'origine sous 14 jours après réception. Le remboursement est effectué sous 5 à 10 jours ouvrés après réception du retour. Un conseiller peut finaliser la demande pour vous.",
  },
  {
    keywords: ['retour', 'rendre', 'return'],
    reply:
      "Vous disposez de 14 jours après réception pour retourner un article. Contactez le support pour générer une étiquette de retour, puis expédiez le colis. Le remboursement est traité sous 5 à 10 jours ouvrés.",
  },
  {
    keywords: ['livrer', 'livraison', 'suivi', 'colis', 'expédie', 'tracking'],
    reply:
      "La livraison standard prend en général 3 à 5 jours ouvrés, l'express 24 à 48 h. Vous recevez un email avec votre numéro de suivi dès l'expédition. Si vous ne l'avez pas reçu, vérifiez vos spams ou contactez-nous.",
  },
  {
    keywords: ['paiement', 'payer', 'paypal', 'carte', 'espèces', 'stripe', 'factur'],
    reply:
      "Nous acceptons le paiement par carte bancaire en ligne (Stripe) et les espèces à la livraison. Le paiement en ligne est sécurisé et le débit est confirmé immédiatement.",
  },
  {
    keywords: ['compte', 'mot de passe', 'connexion', 'inscription', 'mdp', 'login'],
    reply:
      "Pour gérer votre compte (mot de passe, coordonnées, notifications), connectez-vous puis rendez-vous dans votre profil. Vous pouvez réinitialiser votre mot de passe depuis la page de connexion.",
  },
  {
    keywords: ['disponible', 'stock', 'rupture', 'reappro', 'produit', 'dispo'],
    reply:
      "Le niveau de stock est indiqué sur chaque fiche produit. Si un article est en rupture, il apparaît 'épuisé' et n'est pas commandable. Recontactez-nous pour connaître une date de réapprovisionnement.",
  },
  {
    keywords: ['prix', 'tarif', 'coût', 'cout', 'combien', 'promo', 'réduction', 'reduction', 'code'],
    reply:
      "Les prix, promotions et codes de réduction applicables sont affichés sur les fiches produits et lors du paiement. La TVA est incluse dans les prix affichés.",
  },
  {
    keywords: ['horaires', 'ouvert', 'contact', 'téléphone', 'telephone', 'email', 'appel'],
    reply:
      "Le support est joignable du lundi au vendredi, de 9h à 18h. Vous pouvez aussi nous écrire via le formulaire de contact ; nous répondons sous 24 h ouvrées.",
  },
  {
    keywords: ['annuler', 'annulation', 'cancel'],
    reply:
      "Vous pouvez annuler une commande tant qu'elle n'a pas été expédiée. Contactez-nous rapidement avec votre numéro de commande pour procéder à l'annulation.",
  },
  {
    keywords: ['merci', 'super', 'parfait', 'génial', 'genial', 'top', 'ok merci'],
    reply: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. 😊",
  },
];

const FALLBACK =
  "Merci pour votre message ! Un conseiller du support va vous répondre dès que possible. En attendant, vous pouvez consulter la FAQ ou vos commandes depuis votre compte.";

// Normalise un texte : minuscules, sans accents.
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Génère la réponse du bot pour un message client.
export function botReply(text) {
  const norm = normalize(String(text || '').trim());
  if (!norm) return FALLBACK;
  for (const rule of RULES) {
    if (rule.keywords.some((k) => norm.includes(normalize(k)))) {
      return rule.reply;
    }
  }
  return FALLBACK;
}

// Vérifie si le dernier message d'une conversation appartient au bot.
// Si le dernier auteur est un admin (autre que le bot) ou le client, on ajuste.
async function lastMessageAuthor(roomId) {
  const last = await prisma.chatMessage.findFirst({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    select: { authorId: true, createdAt: true },
  });
  return last ? last.authorId : null;
}

// Déclenche la réponse automatique après un message client, si aucun
// administrateur n'est engagé. Retourne le message du bot persisté, ou null.
export async function autoReply(io, socket, roomId) {
  let bot;
  try {
    bot = await getSystemBot();
  } catch (err) {
    console.error('[chat][bot] Échec de création du bot:', err.message);
    return null;
  }

  const lastAuthorId = await lastMessageAuthor(roomId);
  // Si le dernier message n'est pas du client et pas du bot, un admin est
  // engagé -> on ne répond pas.
  if (lastAuthorId !== bot.id && lastAuthorId !== socket.user.id) {
    return null;
  }

  // Petite latence "humaine" avant de répondre.
  await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 700));

  // Re-vérifie que personne n'a répondu entretemps.
  const nowLast = await lastMessageAuthor(roomId);
  if (nowLast !== bot.id && nowLast !== socket.user.id) return null;

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || room.status === 'CLOSED') return null;

  const lastMsg = await prisma.chatMessage.findFirst({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, email: true } } },
  });
  if (!lastMsg || lastMsg.author.id === bot.id) return null;

  const reply = botReply(lastMsg.body);
  const message = await prisma.chatMessage.create({
    data: { roomId: room.id, authorId: bot.id, body: reply },
    include: { author: { select: { id: true, email: true, displayName: true, avatar: true, role: true } } },
  });

  io.to(`chat:room:${room.id}`).emit('chat:new-message', message);
  // On ne notifie pas les admins pour ne pas les spammer tant que le bot gère.
  return message;
}
