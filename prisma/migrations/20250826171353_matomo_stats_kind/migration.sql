/*
  Warnings:

  - Changed the type of `kind` on the `MatomoStats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
DROP INDEX "ngc"."MatomoStats_date_source_kind_referrer_device_iframe_key";

ALTER TABLE "ngc"."MatomoStats" ADD COLUMN "kind_tmp" "ngc"."StatsKind";

UPDATE "ngc"."MatomoStats" SET "kind_tmp" = "kind"::text::"ngc"."StatsKind";

ALTER TABLE "ngc"."MatomoStats" ALTER COLUMN "kind_tmp" SET NOT NULL;

ALTER TABLE "ngc"."MatomoStats" DROP COLUMN "kind";

ALTER TABLE "ngc"."MatomoStats" RENAME COLUMN "kind_tmp" TO "kind";

DROP TYPE "ngc"."MatomoStatsKind";

CREATE UNIQUE INDEX "MatomoStats_date_source_kind_referrer_device_iframe_key" ON "ngc"."MatomoStats"("date", "source", "kind", "referrer", "device", "iframe");
