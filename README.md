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

---

*Projet construit étape par étape.*