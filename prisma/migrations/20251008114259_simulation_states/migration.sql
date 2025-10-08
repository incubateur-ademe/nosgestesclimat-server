-- CreateTable
CREATE TABLE "ngc"."SimulationState" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "simulationId" UUID NOT NULL,
    "progression" REAL NOT NULL,

    CONSTRAINT "SimulationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulationState_date_simulationId_key" ON "ngc"."SimulationState"("date", "simulationId");

-- AddForeignKey
ALTER TABLE "ngc"."SimulationState" ADD CONSTRAINT "SimulationState_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "ngc"."Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
