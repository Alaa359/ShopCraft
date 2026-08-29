import dotenv from 'dotenv';
import { prisma } from '../lib/prisma.js';

dotenv.config();

// Usage : node scripts/make-admin.js EMAIL
// ou : npm run make:admin -- adresse@email.com
const email = process.argv[2];

if (!email) {
  console.error('Usage : node scripts/make-admin.js user@email.com');
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });

if (!user) {
  console.error(`Aucun utilisateur avec l'email "${email}".`);
  process.exit(1);
}

await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
console.log(`L'utilisateur "${email}" est maintenant ADMIN.`);
await prisma.$disconnect();