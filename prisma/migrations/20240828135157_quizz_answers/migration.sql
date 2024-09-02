-- CreateEnum
CREATE TYPE "QuizzAnswerIsAnswerCorrect" AS ENUM ('correct', 'almost', 'wrong');

-- CreateTable
CREATE TABLE "QuizzAnswer" (
    "id" TEXT NOT NULL,
    "simulationId" UUID NOT NULL,
    "isAnswerCorrect" "QuizzAnswerIsAnswerCorrect" NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizzAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizzAnswer_simulationId_answer_key" ON "QuizzAnswer"("simulationId", "answer");
