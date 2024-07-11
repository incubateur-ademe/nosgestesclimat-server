import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'
import { Poll } from '../../schemas/PollSchema'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .route('/')
  .post(async (req: Request, res: Response) => {
    try {
      const pollSlug = req.body.pollSlug
      const orgaSlug = req.body.orgaSlug
      const email = req.body.email?.toLowerCase()
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

      await poll.save()

      setSuccessfulJSONResponse(res)
      res.json(true)
    } catch (error) {
      console.log(error)
      return res.status(403).json(error)
    }
  })

export default router
