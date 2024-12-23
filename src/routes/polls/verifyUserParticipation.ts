import type { Request, Response } from 'express'
import express from 'express'
import { findPopulatedPollBySlug } from '../../helpers/organisations/findPopulatedPollBySlug'
import { Organisation } from '../../schemas/OrganisationSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Verify if a user has already participated in a poll
 */
router.route('/').post(async (req: Request, res: Response) => {
  const pollSlug = req.body.pollSlug
  const userId = req.body.userId
  const email = formatEmail(req.body.email)

  if (!pollSlug) {
    return res.status(500).send('You must provide a poll slug')
  }

  if (!userId) {
    return res.status(500).send('You must provide a user id')
  }

  try {
    const decodedSlug = decodeURIComponent(pollSlug)

    const poll = await findPopulatedPollBySlug(decodedSlug)

    if (!poll) {
      return res.status(404).send('This poll does not exist')
    }

    const hasUserAlreadyParticipated = poll.simulations.some((simulation) => {
      if (simulation?.user.userId === userId) {
        return true
      }

      if ((simulation?.user).email && (simulation?.user).email === email) {
        return true
      }
    })

    let organisation = undefined

    if (hasUserAlreadyParticipated) {
      organisation = await Organisation.findOne({
        polls: {
          $in: poll._id,
        },
      })
    }

    setSuccessfulJSONResponse(res)

    res.json({
      hasUserAlreadyParticipated,
      organisationSlug: organisation?.slug,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error while fetching poll')
  }
})

/**
 * @deprecated should use features/organisations instead
 */
export default router
