-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "survey" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "progress" REAL NOT NULL,
    "byCategory" JSONB NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Answer_id_survey_key" ON "Answer"("id", "survey");
