import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'

/**
 * This script is used to migrate the poll and group fields of simulations to polls and groups. We now want to be able to have multiple polls and groups on a simulation
 * It was run in production sometime in the beginning of 2024
 */
async function migratePollAndGroup() {
  console.log('Start migration of poll and group')
  mongoose.connect(config.mongo.url)
  try {
    const simulationsWithPollOrGroup = await Simulation.find({
      $or: [{ group: { $ne: null } }, { poll: { $ne: null } }],
    })

    console.log('Simulations to migrate', simulationsWithPollOrGroup.length)

    for (const simulation of simulationsWithPollOrGroup) {
      if (simulation.poll) {
        simulation.polls = [simulation.poll]
        delete simulation.poll
      }
      if (simulation.group) {
        simulation.groups = [simulation.group]
        delete simulation.group
      }

      await simulation.save()

      console.log(`Simulation migrated: ${simulation._id}.`)
    }

    console.log('Simulations poll and group migration done')
  } catch (error) {
    console.error('Error migrating simulations poll and group', error)
  }
}

migratePollAndGroup()
