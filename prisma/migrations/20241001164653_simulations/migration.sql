-- CreateEnum
CREATE TYPE "SimulationAdditionalQuestionAnswerType" AS ENUM ('custom', 'default');

-- CreateTable
CREATE TABLE "Simulation" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "progression" REAL NOT NULL,
    "savedViaEmail" BOOLEAN NOT NULL,
    "computedResults" JSONB NOT NULL,
    "actionChoices" JSONB NOT NULL,
    "situation" JSONB NOT NULL,
    "foldedSteps" JSONB[],
    "userId" UUID NOT NULL,
    "userEmail" EMAIL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAdditionalQuestionAnswer" (
    "id" UUID NOT NULL,
    "type" "SimulationAdditionalQuestionAnswerType" NOT NULL,
    "simulationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationAdditionalQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationPoll" (
    "id" UUID NOT NULL,
    "pollId" TEXT NOT NULL,
    "simulationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationPoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulationPoll_simulationId_pollId_key" ON "SimulationPoll"("simulationId", "pollId");

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "VerifiedUser"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAdditionalQuestionAnswer" ADD CONSTRAINT "SimulationAdditionalQuestionAnswer_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationPoll" ADD CONSTRAINT "SimulationPoll_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationPoll" ADD CONSTRAINT "SimulationPoll_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
