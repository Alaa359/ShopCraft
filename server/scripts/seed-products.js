// Script de seed : crée des produits de démonstration dans la base.
// Les produits restent persistés dans PostgreSQL une fois insérés.
// Usage : node scripts/seed-products.js  (depuis le dossier server/)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Casque Audio sans Fil Over-Ear',
    description:
      'Casque avec réduction de bruit active, 30 heures d’autonomie et coussinets en mousse à mémoire de forme. Son riche et équilibré.',
    price: 129.99,
    stock: 25,
    category: 'Électronique',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
  },
  {
    name: 'Montre Connectée Sport',
    description:
      'Montre avec suivi du rythme cardiaque, GPS intégré, résistance à l’eau 5 ATM et autonomie de 7 jours. Idéale pour le running et le quotidien.',
    price: 199.0,
    stock: 15,
    category: 'Électronique',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
  },
  {
    name: 'Clavier Mécanique Rétroéclairé',
    description:
      'Clavier mécanique avec switches tactiles, rétroéclairage RGB et repose-poignet. Connexion USB-C et Bluetooth pour 3 appareils.',
    price: 89.5,
    stock: 40,
    category: 'Électronique',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
  },
  {
    name: 'T-Shirt Coton Bio Premium',
    description:
      'T-shirt en coton biologique 100 %, coupe régulière et sérigraphie résistante au lavage. Disponible en plusieurs coloris.',
    price: 24.99,
    stock: 80,
    category: 'Vêtements',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'],
  },
  {
    name: 'Jean Slim Denim',
    description:
      'Jean slim en denim stretch, confortable au porter et coupe moderne. Taille et longueur adaptées à un usage quotidien.',
    price: 49.99,
    stock: 35,
    category: 'Vêtements',
    images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80'],
  },
  {
    name: 'Veste Imperméable Urbaine',
    description:
      'Veste respirante et imperméable avec capuche amovible. Parfaite pour affronter la pluie en ville comme en randonnée.',
    price: 89.0,
    stock: 20,
    category: 'Vêtements',
    images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80'],
  },
  {
    name: 'Robe d’Été Fleurie',
    description:
      'Robe légère à motifs fleuris, taille ajustable et tissu fluide. Idéale pour les journées ensoleillées.',
    price: 39.99,
    stock: 18,
    category: 'Vêtements',
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80'],
  },
  {
    name: 'Tasse en Céramique (Set de 4)',
    description:
      'Set de 4 tasses en céramique de qualité, résistantes au lave-vaisselle. Émail brillant et poignée confortable.',
    price: 29.99,
    stock: 60,
    category: 'Maison',
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80'],
  },
  {
    name: 'Lampe de Bureau à LED',
    description:
      'Lampe de bureau avec 3 niveaux de luminosité et température de couleur réglable. Pied flexible et rechargeable par USB.',
    price: 34.95,
    stock: 45,
    category: 'Maison',
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80'],
  },
  {
    name: 'Couverture Polaire Douce',
    description:
      'Couverture polaire ultra-douce de 200 x 230 cm. Légère et chaude, idéale pour le canapé ou les nuits fraîches.',
    price: 42.0,
    stock: 30,
    category: 'Maison',
    images: ['https://images.unsplash.com/photo-1580301762395-83a0a2f5f4a1?w=800&q=80'],
  },
  {
    name: 'Serviette de Sport Microfibre',
    description:
      'Serviette compacte en microfibre à séchage rapide. Pochette de rangement incluse, parfaite pour la salle de sport.',
    price: 14.99,
    stock: 100,
    category: 'Sport',
    images: ['https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80'],
  },
  {
    name: 'Ballon de Football Taille 5',
    description:
      'Ballon officiel taille 5 avec coutures renforcées et meilleure tenue de l’air. Convient à un usage amateur régulier.',
    price: 19.99,
    stock: 55,
    category: 'Sport',
    images: ['https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=800&q=80'],
  },
  {
    name: 'Bouteille Isotherme Inox',
    description:
      'Bouteille inox 750 ml à double paroi. Garde vos boissons froides 24 h et chaudes 12 h. Bouchon à visser étanche.',
    price: 27.5,
    stock: 70,
    category: 'Sport',
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80'],
  },
  {
    name: 'Sac à Dos Étanche 25L',
    description:
      'Sac à dos étanche adapté au vélo, à la randonnée et à la ville. Poche ordinateur, sifflet de sécurité et bandoulière réfléchissante.',
    price: 64.99,
    stock: 22,
    category: 'Sport',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'],
  },
  {
    name: 'Crème Hydratante Visage Naturelle',
    description:
      'Crème hydratante à base d’ingrédients naturels (aloe vera, vitamine E). Texture légère et non grasse, pour tous les types de peau.',
    price: 18.5,
    stock: 48,
    category: 'Beauté',
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80'],
  },
  {
    name: 'Parfum Eau de Toilette (50 ml)',
    description:
      'Eau de toilette aux notes boisées et d’agrumes. Flacon élégant de 50 ml, tenue longue durée.',
    price: 59.0,
    stock: 12,
    category: 'Beauté',
    images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80'],
  },
];

async function run() {
  let created = 0;
  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
      console.log(`Déjà présent, ignoré : ${p.name}`);
      continue;
    }
    await prisma.product.create({ data: p });
    created++;
  }
  console.log(`${created} produit(s) créé(s) dans la base shopcraft.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
