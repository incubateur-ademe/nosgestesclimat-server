import type { Request, Response } from 'express'
import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import logger from '../../logger'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Organisation } from '../../schemas/OrganisationSchema'
import { Poll } from '../../schemas/PollSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router
  .use(authentificationMiddleware())
  .route('/')
  .post(async (req: Request, res: Response) => {
    try {
      const pollSlug = req.body.pollSlug
      const orgaSlug = req.body.orgaSlug
      const email = formatEmail(req.body.email)
      const name = req.body.name
      const defaultAdditionalQuestions = req.body.defaultAdditionalQuestions

      if (!pollSlug || !orgaSlug) {
        return res.status(403).json('Error. Missing required info.')
      }

      const decodedOrgaSlug = decodeURIComponent(orgaSlug)

      const organisationFound = await Organisation.findOne({
        slug: decodedOrgaSlug,
        // User should be an admin
        administrators: { $elemMatch: { email } },
      })

      if (!organisationFound) {
        return res
          .status(403)
          .json('Error. Organisation not found or user is not an admin.')
      }

      const decodedPollSlug = decodeURIComponent(pollSlug)

      const poll = await Poll.findOne({ slug: decodedPollSlug })

      if (!poll) {
        return res.status(403).json('Error. Poll not found.')
      }

      if (defaultAdditionalQuestions) {
        poll.defaultAdditionalQuestions = defaultAdditionalQuestions
      }

      if (name) {
        poll.name = name
      }

      await Promise.all([
        poll.save(),
        prisma.poll
          .update({
            where: {
              slug: decodedPollSlug,
            },
            data: {
              name,
              defaultAdditionalQuestions: {
                deleteMany: {
                  pollId: poll._id.toString(),
                },
                ...(!!defaultAdditionalQuestions?.length
                  ? {
                      createMany: {
                        data: defaultAdditionalQuestions.map(
                          (type: string) => ({
                            type,
                          })
                        ),
                      },
                    }
                  : {}),
              },
            },
          })
          .catch((error) =>
            logger.error('postgre Polls replication failed', error)
          ),
      ])

      setSuccessfulJSONResponse(res)
      res.json(true)
    } catch (error) {
      console.log(error)
      return res.status(403).json(error)
    }
  })

/**
 * @deprecated should use features/organisations instead
 */
export default router
