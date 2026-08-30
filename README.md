# ShopCraft 🛒

Boutique en ligne (e-commerce) complète : catalogue, panier, paiement Stripe et dashboard admin.

## Fonctionnalités

### Côté client
- **Catalogue** : grille de produits avec filtres (catégorie, recherche par nom, prix).
- **Fiche produit** : galerie d'images, description, disponibilité du stock, **avis / notes** (1 à 5 étoiles + commentaire) avec note moyenne.
- **Panier** (Zustand) : ajout, modification des quantités, suppression, calcul automatique du total.
- **Paiement Stripe** (mode test) sur la page Checkout, avec confirmation par **webhook** (gère le 3DS / les paiements asynchrones). Un **mode simulé** permet de tester sans clés Stripe.
- **Compte utilisateur** : inscription / connexion (JWT + bcrypt), historique des commandes.

### Côté admin (réservé au rôle `ADMIN`)
- **Dashboard** : revenus totaux, nombre de commandes, commandes en attente, utilisateurs et top 5 des produits les plus vendus.
- **Gestion des produits** : CRUD complet + **upload d'images** (stockage local dans `server/uploads`).
- **Gestion du stock** directement depuis la fiche produit admin.
- **Suivi des commandes** : changement de statut (en attente / expédiée / livrée / annulée).
- **Liste des utilisateurs** apparente via le compteur (v1) ; gestion du catalogue et des commandes côté dashboard.

## Stack technique

| Côté | Technologie |
|------|-------------|
| Frontend | React + Vite, Zustand (panier), react-router-dom |
| Backend | Node.js + Express |
| Base de données | PostgreSQL + Prisma (ORM) |
| Authentification | JWT + bcrypt, rôles `USER` / `ADMIN` |
| Paiement | Stripe (clés de test) + webhook |
| Upload d'images | Multer → stockage local `server/uploads` (v1) |

## Prérequis

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (installé et démarré)
- Optionnel : un compte Stripe (mode test) et la CLI `stripe` pour le webhook local

## Installation

### 1. Dépendances

```bash
npm install            # racine (concurrently)
cd server && npm install
cd ../client && npm install
```

### 2. Variables d'environnement

Copiez le modèle puis complétez :

```bash
copy .env.example server\.env     # Windows PowerShell
# ou : cp .env.example server/.env (Linux/macOS)
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL, ex. `postgresql://postgres:mdp@localhost:5432/shopcraft` |
| `JWT_SECRET` | Clé secrète de signature des tokens (chaîne longue et aléatoire) |
| `PORT` | Port de l'API Express (défaut : `5000`) |
| `CLIENT_URL` | URL du front en dev : `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | Clé **secrète** Stripe de test (`sk_test_...`) — jamais exposée au client |
| `STRIPE_PUBLIC_KEY` | Clé **publique** Stripe de test (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secret `whsec_...` du webhook (voir section Stripe), optionnel en dev simple |

> ⚠️ `server/.env` contient des secrets : il est **ignoré par git** (voir `.gitignore`). Ne le commitez jamais, le dépôt est public.

### 3. Base de données

```bash
cd server
npx prisma migrate dev      # crée la base `shopcraft` + applique le schéma
```

### 4. Lancement en développement

```bash
npm run dev              # depuis la racine : API (port 5000) + front (port 5173)
```

Ou en deux terminaux :

```bash
npm run dev:server       # API Express -> http://localhost:5000
npm run dev:client       # Front Vite  -> http://localhost:5173
```

Ouvrez **http://localhost:5173**.

## Créer un compte administrateur

1. Inscrivez-vous normalement via la page « Connexion / Inscription ».
2. Passez le compte en admin :

```bash
cd server
npm run make:admin -- votre@email.com
```

3. Rechargez la page : le lien **Dashboard** apparaît dans la barre de navigation.

## Paiement Stripe (mode test)

- Renseignez `STRIPE_SECRET_KEY` et `STRIPE_PUBLIC_KEY` (clés de test) dans `server/.env`.
- Cartes de test à utiliser : `4242 4242 4242 4242` (paiement réussi), `4000 0025 0000 3155` (déclenche une authentification 3DS).
- **Webhook** (recommandé pour 3DS / confirmations asynchrones) :

```bash
stripe listen --forward-to http://localhost:5000/webhook/stripe
# copiez le whsec_... affiché et placez-le dans : server/.env -> STRIPE_WEBHOOK_SECRET
```

- **Sans clés ni webhook** : le site bascule automatiquement en **mode simulé** (bouton « commander et payer ») pour tester le flux complet sans argent réel.

## Scripts utiles

À la racine :

```bash
npm run dev              # API + front en parallèle
npm run dev:server       # API seule
npm run dev:client       # front seul
```

Côté `server/` :

```bash
npm run dev              # API (nodemon)
npm start                # API (node)
npm run prisma:migrate   # applique/migre le schéma Prisma
npm run make:admin -- email@example.com   # passe un compte en ADMIN
```

Côté `client/` :

```bash
npm run build            # build de production
npm run preview          # prévisualise le build
```

## Structure du projet

```
shopcraft/
├── client/                     → application React (Vite)
│   └── src/
│       ├── pages/              → Home, ProductPage, Cart, Checkout, Login, Register, Account
│       │   └── admin/          → Dashboard, ProductsAdmin, OrdersAdmin
│       ├── components/         → Navbar, ProductCard, CartItem, Filters, ProtectedRoute, AdminRoute
│       ├── store/              → cartStore.js (Zustand), authStore.js
│       ├── api/client.js       → appels vers l'API Express
│       └── App.jsx             → routes
├── server/                     → API Express
│   ├── routes/                 → products, orders, auth, payments, reviews, stats, uploads
│   ├── prisma/                 → schema.prisma + migrations
│   ├── middleware/             → auth.js, isAdmin.js
│   ├── lib/                    → prisma.js, stripe.js, cart.js, upload.js, orderService.js
│   ├── uploads/                → images uploadées (ignorées par git)
│   ├── scripts/                → make-admin.js
│   └── index.js                → point d'entrée + webhook Stripe
├── .env.example                → modèle des variables d'environnement
├── .gitignore
└── README.md
```

## Sécurité

- La clé **secrète** Stripe ne quitte jamais le serveur ; le montant est toujours recalculé côté serveur (`lib/cart.js`).
- Les mots de passe sont hachés avec **bcrypt** (10 rounds).
- Toutes les routes admin passent par les middlewares `auth` + `isAdmin`.
- Les avis ne sont modifiables/supprimables que par leur auteur.
- Tout `.env` est ignoré par git ; les images uploadées (`server/uploads/*`) aussi.

---

*Projet construit étape par étape (backend → catalogue → panier → auth → paiement Stripe → dashboard admin → avis → finalisation).*