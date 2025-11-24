import { Prisma } from '@prisma/client'
import { prisma } from '../src/adapters/prisma/client.js'
import { defaultSimulationSelection } from '../src/adapters/prisma/selection.js'
import { batchFindMany } from '../src/core/batch-find-many.js'
import logger from '../src/logger.js'

const main = async () => {
  try {
    const batchPollSimulations = batchFindMany((params) =>
      prisma.simulationPoll.findMany({
        ...params,
        where: {
          simulation: {
            extendedSituation: {
              equals: Prisma.AnyNull,
            },
          },
        },
        select: {
          id: true,
          simulation: {
            select: defaultSimulationSelection,
          },
        },
      })
    )

    let updatedSimulations = 0

    for await (const { simulation } of batchPollSimulations) {
      // TODO: evaluate extendedSituation based on simulation data
      const extendedSituation = Prisma.JsonNull

      await prisma.simulation.update({
        where: { id: simulation.id },
        data: {
          extendedSituation,
        },
      })

      updatedSimulations++

      if (updatedSimulations % 1000 === 0) {
        logger.info('Updated simulations', { updatedSimulations })
      }
    }

    logger.info('Updated simulations', { updatedSimulations })
    process.exit(0)
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}

main()
