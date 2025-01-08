-- CreateEnum
CREATE TYPE "ngc"."ApiScopeName" AS ENUM ('ngc', 'agir', 'two_tons');

-- CreateTable
CREATE TABLE "ngc"."IntegrationApiScope" (
    "name" "ngc"."ApiScopeName" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationApiScope_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "ngc"."IntegrationWhitelist" (
    "id" UUID NOT NULL,
    "emailPattern" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "apiScopeName" "ngc"."ApiScopeName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationWhitelist_emailPattern_apiScopeName_key" ON "ngc"."IntegrationWhitelist"("emailPattern", "apiScopeName");

-- AddForeignKey
ALTER TABLE "ngc"."IntegrationWhitelist" ADD CONSTRAINT "IntegrationWhitelist_apiScopeName_fkey" FOREIGN KEY ("apiScopeName") REFERENCES "ngc"."IntegrationApiScope"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
