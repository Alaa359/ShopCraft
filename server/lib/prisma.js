import { PrismaClient } from '@prisma/client';

// Instance unique du client Prisma partagée par toutes les routes
export const prisma = new PrismaClient();