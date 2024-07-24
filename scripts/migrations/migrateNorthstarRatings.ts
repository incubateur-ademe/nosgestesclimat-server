import mongoose from 'mongoose'
import { config } from '../../src/config'
import { NorthstarRating } from '../../src/schemas/NorthstarRatingSchema'
import { Simulation } from '../../src/schemas/SimulationSchema'

// This was never used because no one cares about northstar ratings
async function migrateNorthstarRatings() {
  console.log('Start migration of northstar ratings')
  mongoose.connect(config.mongo.url)
  try {
    const simulationWithData = (await Simulation.find({
      data: { $exists: true },
    })) as any

    console.log('Northstar ratings to migrate', simulationWithData.length)

    for (let simulation of simulationWithData) {
      if (simulation.data?.ratings) {
        const type = simulation.data.ratings.learned ? 'learned' : 'actions'

        const value =
          type === 'learned'
            ? simulation.data.ratings.learned
            : simulation.data.ratings.actions

        if ([0, 1, 2, 3].includes(value)) {
          const northstarRating = new NorthstarRating({
            simulationId: simulation.id,
            value,
            type,
            createdAt: simulation.createdAt,
            updatedAt: simulation.updatedAt,
          })

          await northstarRating.save()

          console.log(`Northstar migrated: ${simulation._id}.`)
        }
      }
    }

    console.log('Northstar ratings migration done')
  } catch (error) {
    console.error('Error migrating northstar ratings', error)
  }
}

migrateNorthstarRatings()