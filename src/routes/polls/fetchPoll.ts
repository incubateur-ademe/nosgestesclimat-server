import express, { Request, Response } from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Poll } from '../../schemas/PollSchema'
import { Organisation } from '../../schemas/OrganisationSchema'

const router = express.Router()

/**
 * Fetching a poll public infos
 */
router
  .route('/:pollSlug?')
  .get(
    async (req: Request & { params: { pollSlug: string } }, res: Response) => {
      const pollSlug = req.params.pollSlug
      const email = decodeURIComponent(req.query.email as string)
      const orgaSlug = decodeURIComponent(req.query.orgaSlug as string)

      if (!pollSlug || !email || !orgaSlug) {
        return res.status(500).send('Missing required info.')
      }

      try {
        const organisation = await Organisation.findOne({
          slug: orgaSlug,
          administrators: { $elemMatch: { email } },
        })

        if (!organisation) {
          return res
            .status(403)
            .send('Organisation not found or user is not an admin.')
        }

        const poll = await Poll.findOne({ slug: pollSlug })

        if (!poll) {
          return res.status(404).send('This poll does not exist')
        }

        setSuccessfulJSONResponse(res)

        res.json(poll)
      } catch (error) {
        return res.status(500).send('Error while fetching poll')
      }
    }
  )

export default router
