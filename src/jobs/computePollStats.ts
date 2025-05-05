import { prisma } from '../adapters/prisma/client'
import { batchFindMany } from '../core/batchFindMany'
import { updatePollFunFacts } from '../features/organisations/organisations.service'
import logger from '../logger'

const main = async () => {
  try {
    const batchPolls = batchFindMany((params) =>
      prisma.poll.findMany({
        ...params,
        where: {
          computeRealTimeStats: false,
        },
        select: {
          id: true,
        },
      })
    )

    for await (const poll of batchPolls) {
      logger.info(`Update poll ${poll.id}`)
      await updatePollFunFacts({ pollId: poll.id }, { session: prisma })
    }

    process.exit(0)
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}

main()
