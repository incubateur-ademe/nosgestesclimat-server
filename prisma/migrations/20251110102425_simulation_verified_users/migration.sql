-- CreateIndex
CREATE INDEX "Simulation_userEmail_idx" ON "ngc"."Simulation"("userEmail") WHERE "userEmail" IS NOT NULL;
