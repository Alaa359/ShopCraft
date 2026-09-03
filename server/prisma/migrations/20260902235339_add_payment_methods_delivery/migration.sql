/*
  Warnings:

  - Added the required column `address` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postalCode` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- AlterTable
-- Les colonnes de livraison reçoivent un DEFAULT temporaire pour remplir
-- les commandes existantes ; la valeur est toujours fournie explicitement
-- par l'application pour les nouvelles commandes.
ALTER TABLE "Order" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalCode" TEXT NOT NULL DEFAULT '';
