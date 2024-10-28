import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import EmailSimulation from '../../src/schemas/_legacy/EmailSimulationSchema'
import { config } from '../../src/config'

async function migrateEmailSimulations() {
  mongoose.connect(config.mongo.url)
  try {
    const emailSimulations = await EmailSimulation.find()
    console.log('Email simulations to migrate', emailSimulations.length)

    for (const emailSimulation of emailSimulations) {
      const data = emailSimulation.data

      if (!data) {
        console.log(
          `Email simulation not migrated: ${emailSimulation._id}, no data.`
        )
        continue
      }

      const newSimulation = new Simulation({
        _id: new mongoose.Types.ObjectId(emailSimulation._id),
        id: data.id,
        actionChoices: data.actionChoices,
        date: data.date ?? new Date(),
        foldedSteps: data.foldedSteps,
        situation: data.situation,
        progression: 1,
      })

      await newSimulation.save()

      //await emailSimulation.delete()

      console.log(
        `Email simulation migrated: ${emailSimulation._id}, emailSimulation deleted.`
      )
    }

    console.log('Email simulations migrated')
  } catch (error) {
    console.error('Error migrating email simulations', error)
  }
}

migrateEmailSimulations()
