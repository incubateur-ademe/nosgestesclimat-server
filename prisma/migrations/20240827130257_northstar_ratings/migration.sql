-- CreateEnum
CREATE TYPE "NorthstarRatingType" AS ENUM ('learned', 'actions');

-- CreateTable
CREATE TABLE "NorthstarRating" (
    "id" TEXT NOT NULL,
    "simulationId" UUID NOT NULL,
    "type" "NorthstarRatingType" NOT NULL,
    "value" SMALLINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NorthstarRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NorthstarRating_simulationId_key" ON "NorthstarRating"("simulationId");
