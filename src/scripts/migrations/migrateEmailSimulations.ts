import mongoose from "mongoose";
import { Simulation } from "../../schemas/SimulationSchema";
import EmailSimulation from "../../schemas/_legacy/EmailSimulationSchema";
import { computeResults } from "./migrateGroups/computeResults";
import Engine from "publicodes";
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'


async function migrateEmailSimulations() {
  const emailSimulations = await EmailSimulation.find()

  const engine = new Engine(rules as any)


  for (const emailSimulation of emailSimulations) {
    const data = emailSimulation.data

    const newEmailSimulation = new Simulation({
      _id: new mongoose.Types.ObjectId(emailSimulation._id),
      id: data.id,
      actionChoices: data.actionChoices,
      date: data.date ?? new Date(),
      foldedSteps: data.foldedSteps,
      situation: data.situation,
      computedResults: computeResults(data.situation, engine),
      progression: 1,
    })

    newEmailSimulation.save()
  }

  console.log('Email simulations migrated')
}

migrateEmailSimulations()