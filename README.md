# ShopCraft 🛒

Boutique en ligne (e-commerce) complète avec dashboard admin.

## Stack technique

- **Frontend :** React + Vite, Zustand (state management panier)
- **Backend :** Node.js + Express
- **Base de données :** PostgreSQL + Prisma (ORM)
- **Authentification :** JWT + bcrypt, rôles `user` / `admin`
- **Paiement :** Stripe (mode test)
- **Upload d'images :** stockage local dans `server/uploads` (v1)

## Structure

```
shopcraft/
├── client/          → application React (Vite)
├── server/          → API Express
│   ├── routes/      → produits, commandes, auth, paiements
│   ├── prisma/      → schéma de base de données
│   ├── middleware/  → auth.js, isAdmin.js
│   └── uploads/     → images uploadées (ignorées par git)
├── .env.example     → variables d'environnement à copier en .env
└── README.md
```

## Installation (à compléter)

Le fichier README sera complété au fil des étapes : configuration, variables d'environnement, migration de la base, clés Stripe test et commandes de lancement.

## Paiement Stripe (mode test)

Pour un paiement synchronisé (webhook optionnel en test) :

1. Ajoutez vos clés `STRIPE_SECRET_KEY` et `STRIPE_PUBLIC_KEY` (test) dans `server/.env`.
2. Pour activer la confirmation asynchrone (ex. 3DS), lancez le relais local :
   ```
   stripe listen --forward-to http://localhost:5000/webhook/stripe
   ```
   puis copiez le `whsec_...` affiché dans `server/.env` → `STRIPE_WEBHOOK_SECRET`.
3. Sans clé ni webhook, le site bascule automatiquement en **mode simulé** (bouton "paiement") pour tester sans payer.

---

*Projet construit étape par étape.*