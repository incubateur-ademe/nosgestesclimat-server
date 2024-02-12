import express, { Request, Response } from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { findPollBySlug } from '../../helpers/organizations/findPollBySlug'
import { PollPublicInfo } from '../../types/types'

const router = express.Router()

/**
 * Fetching multiple polls public infos
 */
router.post('/', async (req: Request, res: Response) => {
  const polls = req.body.polls

  if (!polls || !polls.length) {
    return res.status(403).json('You must provide at least one poll slug')
  }

  try {
    const pollsPublicInfos: PollPublicInfo[] = polls.map(
      async (pollSlug: string) => {
        const poll = await findPollBySlug(pollSlug)

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
        return pollPublicInfos
      }
    )

    setSuccessfulJSONResponse(res)

    res.json(pollsPublicInfos)
  } catch (error) {
    return res.status(500).send('Error while fetching poll')
  }
})

export default router
