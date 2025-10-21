-- CreateEnum
CREATE TYPE "ngc"."VerificationCodeMode" AS ENUM ('signIn', 'signUp');

-- AlterTable
ALTER TABLE "ngc"."VerificationCode" ADD COLUMN     "mode" "ngc"."VerificationCodeMode";
