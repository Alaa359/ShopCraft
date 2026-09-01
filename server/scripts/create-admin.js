// Crée (ou met à jour) un compte admin dans la base.
// Usage : node scripts/create-admin.js EMAIL PASSWORD
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage : node scripts/create-admin.js EMAIL PASSWORD');
  process.exit(1);
}
if (password.length < 6) {
  console.error('Le mot de passe doit contenir au moins 6 caractères');
  process.exit(1);
}

const hashed = await bcrypt.hash(password, 10);

const user = await prisma.user.upsert({
  where: { email },
  update: { password: hashed, role: 'ADMIN' },
  create: { email, password: hashed, role: 'ADMIN' },
});

console.log(`Compte ADMIN prêt : ${user.email} (id: ${user.id})`);
await prisma.$disconnect();
