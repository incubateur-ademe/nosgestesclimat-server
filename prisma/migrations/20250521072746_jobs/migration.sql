-- CreateEnum
CREATE TYPE "ngc"."JobStatus" AS ENUM ('pending', 'running', 'success', 'failure');

-- CreateTable
CREATE TABLE "ngc"."Job" (
    "id" VARCHAR(64) NOT NULL,
    "status" "ngc"."JobStatus" NOT NULL,
    "params" JSONB NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."JobExecution" (
    "id" UUID NOT NULL,
    "jobId" VARCHAR(64) NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "JobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobExecution_id_jobId_key" ON "ngc"."JobExecution"("id", "jobId");

-- AddForeignKey
ALTER TABLE "ngc"."JobExecution" ADD CONSTRAINT "JobExecution_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ngc"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
