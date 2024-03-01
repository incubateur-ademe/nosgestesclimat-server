import mongoose from "mongoose";
import { Simulation } from "../../schemas/SimulationSchema";
import EmailSimulation from "../../schemas/_legacy/EmailSimulationSchema";

async function migrateEmailSimulations() {
  const emailSimulations = await EmailSimulation.find()

  for (const emailSimulation of emailSimulations) {
    const data = emailSimulation.data

    const newEmailSimulation = new Simulation({
      _id: new mongoose.Types.ObjectId(emailSimulation._id),
      id: data.id,
      actionChoices: data.actionChoices,
      date: data.date ?? new Date(),
      foldedSteps: data.foldedSteps,
      situation: data.situation,
      progression: 1,
    })

    newEmailSimulation.save()
  }

  console.log('Email simulations migrated')
}

migrateEmailSimulations()