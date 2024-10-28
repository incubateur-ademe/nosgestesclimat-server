-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ngc";

-- CreateEnum
CREATE TYPE "ngc"."NorthstarRatingType" AS ENUM ('learned', 'actions');

-- CreateEnum
CREATE TYPE "ngc"."OrganisationType" AS ENUM ('association', 'company', 'cooperative', 'groupOfFriends', 'other', 'publicOrRegionalAuthority', 'universityOrSchool');

-- CreateEnum
CREATE TYPE "ngc"."PollDefaultAdditionalQuestionType" AS ENUM ('postalCode', 'birthdate');

-- CreateEnum
CREATE TYPE "ngc"."QuizzAnswerIsAnswerCorrect" AS ENUM ('correct', 'almost', 'wrong');

-- CreateEnum
CREATE TYPE "ngc"."SimulationAdditionalQuestionAnswerType" AS ENUM ('custom', 'default');

-- emails
CREATE DOMAIN "ngc"."EMAIL" AS TEXT
  CHECK ( VALUE ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$' );

-- CreateTable
CREATE TABLE "ngc"."Answer" (
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

-- CreateTable
CREATE TABLE "ngc"."EmailSimulation" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."GroupAdministrator" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupAdministrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."GroupParticipant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "simulationId" UUID NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."NorthstarRating" (
    "id" TEXT NOT NULL,
    "simulationId" UUID NOT NULL,
    "type" "ngc"."NorthstarRatingType" NOT NULL,
    "value" SMALLINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NorthstarRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."Organisation" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(105) NOT NULL,
    "type" "ngc"."OrganisationType",
    "numberOfCollaborators" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."OrganisationAdministrator" (
    "id" TEXT NOT NULL,
    "userEmail" "ngc"."EMAIL" NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationAdministrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."Poll" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(155) NOT NULL,
    "expectedNumberOfParticipants" INTEGER,
    "customAdditionalQuestions" JSONB NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."PollDefaultAdditionalQuestion" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "type" "ngc"."PollDefaultAdditionalQuestionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollDefaultAdditionalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."QuizzAnswer" (
    "id" TEXT NOT NULL,
    "simulationId" UUID NOT NULL,
    "isAnswerCorrect" "ngc"."QuizzAnswerIsAnswerCorrect" NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizzAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."Simulation" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "progression" REAL NOT NULL,
    "savedViaEmail" BOOLEAN NOT NULL,
    "computedResults" JSONB NOT NULL,
    "actionChoices" JSONB NOT NULL,
    "situation" JSONB NOT NULL,
    "foldedSteps" JSONB[],
    "userId" UUID NOT NULL,
    "userEmail" "ngc"."EMAIL",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."SimulationAdditionalQuestionAnswer" (
    "id" UUID NOT NULL,
    "type" "ngc"."SimulationAdditionalQuestionAnswerType" NOT NULL,
    "simulationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationAdditionalQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."SimulationPoll" (
    "id" UUID NOT NULL,
    "pollId" TEXT NOT NULL,
    "simulationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."Survey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contextFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."User" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" "ngc"."EMAIL",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."VerificationCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" "ngc"."EMAIL" NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngc"."VerifiedUser" (
    "email" "ngc"."EMAIL" NOT NULL,
    "id" UUID NOT NULL,
    "name" TEXT,
    "telephone" TEXT,
    "position" TEXT,
    "optedInForCommunications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiedUser_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE UNIQUE INDEX "Answer_id_survey_key" ON "ngc"."Answer"("id", "survey");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAdministrator_groupId_key" ON "ngc"."GroupAdministrator"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupParticipant_groupId_userId_key" ON "ngc"."GroupParticipant"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NorthstarRating_simulationId_key" ON "ngc"."NorthstarRating"("simulationId");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "ngc"."Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationAdministrator_userEmail_key" ON "ngc"."OrganisationAdministrator"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_slug_key" ON "ngc"."Poll"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PollDefaultAdditionalQuestion_pollId_type_key" ON "ngc"."PollDefaultAdditionalQuestion"("pollId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "QuizzAnswer_simulationId_answer_key" ON "ngc"."QuizzAnswer"("simulationId", "answer");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationPoll_simulationId_pollId_key" ON "ngc"."SimulationPoll"("simulationId", "pollId");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_name_key" ON "ngc"."Survey"("name");

-- AddForeignKey
ALTER TABLE "ngc"."GroupAdministrator" ADD CONSTRAINT "GroupAdministrator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ngc"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."GroupAdministrator" ADD CONSTRAINT "GroupAdministrator_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ngc"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."GroupParticipant" ADD CONSTRAINT "GroupParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ngc"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."GroupParticipant" ADD CONSTRAINT "GroupParticipant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ngc"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."OrganisationAdministrator" ADD CONSTRAINT "OrganisationAdministrator_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "ngc"."VerifiedUser"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."OrganisationAdministrator" ADD CONSTRAINT "OrganisationAdministrator_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "ngc"."Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."Poll" ADD CONSTRAINT "Poll_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "ngc"."Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."PollDefaultAdditionalQuestion" ADD CONSTRAINT "PollDefaultAdditionalQuestion_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ngc"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."Simulation" ADD CONSTRAINT "Simulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ngc"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."Simulation" ADD CONSTRAINT "Simulation_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "ngc"."VerifiedUser"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."SimulationAdditionalQuestionAnswer" ADD CONSTRAINT "SimulationAdditionalQuestionAnswer_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "ngc"."Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."SimulationPoll" ADD CONSTRAINT "SimulationPoll_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ngc"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngc"."SimulationPoll" ADD CONSTRAINT "SimulationPoll_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "ngc"."Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
