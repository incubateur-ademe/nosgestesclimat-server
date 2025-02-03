-- UpdateTable
UPDATE "ngc"."Organisation" SET "type"='other' WHERE "type" IS NULL;
-- AlterTable
ALTER TABLE "ngc"."Organisation" ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'other';
