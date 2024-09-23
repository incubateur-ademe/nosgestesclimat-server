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
  .use(authentificationMiddleware)
  .route('/:pollSlug?')
  .delete(async (req: Request, res: Response) => {
    try {
      const pollSlug = req.params.pollSlug
      const orgaSlug = decodeURIComponent(req.query.orgaSlug as string)
      const email = decodeURIComponent(formatEmail(req.query.email as string))

      if (!pollSlug || !orgaSlug || !email) {
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

      await Promise.all([
        Poll.deleteOne({ slug: decodedPollSlug }),
        prisma.poll
          .delete({
            where: {
              slug: decodedPollSlug,
            },
          })
          .catch((error) =>
            logger.error('postgre Polls replication failed', error)
          ),
      ])

      setSuccessfulJSONResponse(res)
      res.json(true)
    } catch (error) {
      return res.status(403).json(error)
    }
  })

/**
 * @deprecated should use features/organisations instead
 */
export default router
