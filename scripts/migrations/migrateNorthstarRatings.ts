/* eslint-disable @typescript-eslint/no-explicit-any */
import { NorthstarRatingType } from '@prisma/client'
import mongoose from 'mongoose'
import { config } from '../../src/config'
import { NorthstarRating } from '../../src/schemas/NorthstarRatingSchema'
import type { SimulationType } from '../../src/schemas/SimulationSchema'
import { Simulation } from '../../src/schemas/SimulationSchema'

type SimulationWithData = SimulationType & {
  data: any
}

// This was never used because no one cares about northstar ratings
async function migrateNorthstarRatings() {
  console.log('Start migration of northstar ratings')
  mongoose.connect(config.mongo.url)
  try {
    const simulationWithData = await Simulation.find<SimulationWithData>({
      data: { $exists: true },
    })

    console.log('Northstar ratings to migrate', simulationWithData.length)

    for (const simulation of simulationWithData) {
      if (simulation.data?.ratings) {
        const type = simulation.data.ratings.learned
          ? NorthstarRatingType.learned
          : NorthstarRatingType.actions

        const value =
          type === NorthstarRatingType.learned
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
