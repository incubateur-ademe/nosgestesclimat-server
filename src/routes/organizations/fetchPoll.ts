import express, { Request, Response } from 'express'
import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { findPollBySlug } from '../../helpers/organizations/findPollBySlug'
import { PollPublicInfo } from '../../types/types'

const router = express.Router()

/**
 * Fetching a poll public infos
 */
router
  .route('/:pollSlug?')
  .get(
    async (req: Request & { params: { pollSlug: string } }, res: Response) => {
      if (!req.params.pollSlug) {
        return res.status(404).send('You must provide a poll slug')
      }

      try {
        const poll = await findPollBySlug(req.params.pollSlug)

        if (!poll) {
          return res.status(404).send('This poll does not exist')
        }

        const organisation = await Organization.findOne({
          polls: poll._id,
        })

        if (!organisation) {
          return res.status(404).send('This poll does not exist')
        }

        const pollPublicInfos: PollPublicInfo = {
          name: poll.slug,
          slug: poll.slug,
          defaultAdditionalQuestions: poll.defaultAdditionalQuestions,
          expectedNumberOfParticipants: poll.expectedNumberOfParticipants,
          organisationInfo: {
            name: organisation.name,
            slug: organisation.slug,
          },
        }

        setSuccessfulJSONResponse(res)

        res.json(pollPublicInfos)
      } catch (error) {
        return res.status(500).send('Error while fetching poll')
      }
    }
  )

export default router
