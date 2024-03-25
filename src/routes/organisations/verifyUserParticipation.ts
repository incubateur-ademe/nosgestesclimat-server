import express, { Request, Response } from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { findPopulatedPollBySlug } from '../../helpers/organisations/findPopulatedPollBySlug'
import { SimulationType } from '../../schemas/SimulationSchema'

const router = express.Router()

/**
 * Verify if a user has already participated in a poll
 */
router
  .route('verify-user-participation')
  .post(async (req: Request, res: Response) => {
    const pollSlug = req.body.pollSlug
    const userId = req.body.userId

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
      ).some((simulation) => (simulation?.user as any).userId)

      setSuccessfulJSONResponse(res)

      res.json(hasUserAlreadyParticipated)
    } catch (error) {
      return res.status(500).send('Error while fetching poll')
    }
  })

export default router
