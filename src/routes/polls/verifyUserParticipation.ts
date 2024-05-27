import express, { Request, Response } from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { findPopulatedPollBySlug } from '../../helpers/organisations/findPopulatedPollBySlug'
import { SimulationType } from '../../schemas/SimulationSchema'
import { Organisation } from '../../schemas/OrganisationSchema'

const router = express.Router()

/**
 * Verify if a user has already participated in a poll
 */
router.route('/').post(async (req: Request, res: Response) => {
  const pollSlug = req.body.pollSlug
  const userId = req.body.userId
  const email = req.body.email

  if (!pollSlug) {
    return res.status(500).send('You must provide a poll slug')
  }

  if (!userId) {
    return res.status(500).send('You must provide a user id')
  }

  try {
    const poll = await findPopulatedPollBySlug(pollSlug)

    if (!poll) {
      return res.status(404).send('This poll does not exist')
    }

    const hasUserAlreadyParticipated = (
      poll.simulations as unknown as SimulationType[]
    ).some((simulation) => {
      if ((simulation?.user as any).userId === userId) {
        return true
      }

      if (
        (simulation?.user as any).email &&
        (simulation?.user as any).email === email
      ) {
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
    return res.status(500).send('Error while fetching poll')
  }
})

export default router
