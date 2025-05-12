-- CreateEnum
CREATE TYPE "ngc"."MatomoStatsSource" AS ENUM ('beta', 'data');

-- CreateEnum
CREATE TYPE "ngc"."MatomoStatsKind" AS ENUM ('campaign', 'direct', 'search', 'social', 'website', 'all');

-- CreateEnum
CREATE TYPE "ngc"."MatomoStatsDevice" AS ENUM ('desktop', 'all');

-- CreateTable
CREATE TABLE "ngc"."MatomoStats" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "source" "ngc"."MatomoStatsSource" NOT NULL,
    "kind" "ngc"."MatomoStatsKind" NOT NULL,
    "referrer" TEXT NOT NULL DEFAULT 'all',
    "device" "ngc"."MatomoStatsDevice" NOT NULL,
    "iframe" BOOLEAN NOT NULL,
    "visits" INTEGER NOT NULL,
    "firstAnswer" INTEGER NOT NULL,
    "finishedSimulations" INTEGER NOT NULL,

    CONSTRAINT "MatomoStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatomoStats_date_source_kind_referrer_device_iframe_key" ON "ngc"."MatomoStats"("date", "source", "kind", "referrer", "device", "iframe");
