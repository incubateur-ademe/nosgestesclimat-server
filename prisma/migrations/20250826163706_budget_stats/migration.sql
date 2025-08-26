-- CreateEnum
CREATE TYPE "ngc"."StatsKind" AS ENUM ('campaign', 'direct', 'search', 'social', 'website', 'all');

-- CreateTable
CREATE TABLE "ngc"."BudgetStats" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "kind" "ngc"."StatsKind" NOT NULL,
    "referrer" TEXT NOT NULL DEFAULT 'all',
    "totalBudget" INTEGER NOT NULL,
    "acquisitionBudget" INTEGER NOT NULL,

    CONSTRAINT "BudgetStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetStats_year_month_kind_referrer_key" ON "ngc"."BudgetStats"("year", "month", "kind", "referrer");

ALTER TABLE "ngc"."BudgetStats"
ADD CONSTRAINT "check_valid_month"
CHECK ("month" BETWEEN 1 AND 12);
