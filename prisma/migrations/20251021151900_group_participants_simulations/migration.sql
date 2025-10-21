-- AddForeignKey
ALTER TABLE "ngc"."GroupParticipant" ADD CONSTRAINT "GroupParticipant_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "ngc"."Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
