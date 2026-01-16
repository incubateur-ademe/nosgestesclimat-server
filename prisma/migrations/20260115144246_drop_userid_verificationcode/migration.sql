/*
  Warnings:

  - You are about to drop the column `userId` on the `VerificationCode` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ngc"."VerificationCode" DROP COLUMN "userId";
