-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "isActivated" BOOLEAN NOT NULL DEFAULT false;
