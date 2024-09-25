-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('association', 'company', 'cooperative', 'groupOfFriends', 'other', 'publicOrRegionalAuthority', 'universityOrSchool');

-- CreateEnum
CREATE TYPE "PollDefaultAdditionalQuestionType" AS ENUM ('postalCode', 'birthdate');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(105) NOT NULL,
    "type" "OrganisationType",
    "numberOfCollaborators" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationAdministrator" (
    "id" TEXT NOT NULL,
    "userEmail" EMAIL NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationAdministrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
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
CREATE TABLE "PollDefaultAdditionalQuestion" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "type" "PollDefaultAdditionalQuestionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollDefaultAdditionalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedUser" (
    "email" EMAIL NOT NULL,
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
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationAdministrator_userEmail_key" ON "OrganisationAdministrator"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_slug_key" ON "Poll"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PollDefaultAdditionalQuestion_pollId_type_key" ON "PollDefaultAdditionalQuestion"("pollId", "type");

-- AddForeignKey
ALTER TABLE "OrganisationAdministrator" ADD CONSTRAINT "OrganisationAdministrator_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "VerifiedUser"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationAdministrator" ADD CONSTRAINT "OrganisationAdministrator_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollDefaultAdditionalQuestion" ADD CONSTRAINT "PollDefaultAdditionalQuestion_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
