import { prisma } from '../src/adapters/prisma/client'
import { batchFindMany } from '../src/core/batchFindMany'
import { updatePollFunFacts } from '../src/features/organisations/organisations.service'
import logger from '../src/logger'

const main = async () => {
  try {
    const batchPolls = batchFindMany((params) =>
      prisma.poll.findMany({
        ...params,
        select: {
          id: true,
        },
      })
    )

    let updatedPolls = 0

    for await (const poll of batchPolls) {
      await updatePollFunFacts({ pollId: poll.id }, { session: prisma })

      updatedPolls++

      if (updatedPolls % 100 === 0) {
        logger.info('Updated polls', { updatedPolls })
      }
    }

    logger.info('Updated polls', { updatedPolls })
    process.exit(0)
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}

main()
