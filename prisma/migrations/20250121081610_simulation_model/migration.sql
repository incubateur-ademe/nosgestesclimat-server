-- model
CREATE DOMAIN "ngc"."MODEL" AS TEXT
  CHECK ( VALUE ~ '^[A-Z]+-[a-z]+-\d+\.\d+\.\d+$' );

-- AlterTable
ALTER TABLE "ngc"."Simulation" ADD COLUMN     "model" "ngc"."MODEL" NOT NULL DEFAULT 'FR-fr-0.0.0';
