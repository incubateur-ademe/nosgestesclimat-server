import type { Request, Response } from 'express'
import express from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'
import { Poll } from '../../schemas/PollSchema'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

const MAX_NUMBER_QUESTIONS = 4

router
  .use(authentificationMiddleware)
  .route('/')
  .post(async (req: Request, res: Response) => {
    try {
      const pollSlug = req.body.pollSlug
      const orgaSlug = req.body.orgaSlug
      const customAdditionalQuestions = req.body.customAdditionalQuestions

      if (!pollSlug || !orgaSlug || !customAdditionalQuestions) {
        return res.status(403).json('Error. Missing required info.')
      }

      const decodedOrgaSlug = decodeURIComponent(orgaSlug)
      const organisationFound = await Organisation.findOne({
        slug: decodedOrgaSlug,
      })

      if (!organisationFound) {
        return res.status(403).json('Error. Organisation not found.')
      }

      if (
        !config.organisationIdsWithCustomQuestionsEnabled.includes(
          organisationFound._id.toString()
        )
      ) {
        return res
          .status(403)
          .json('Error. Organisation not allowed to use custom questions.')
      }

      if (
        Object.keys(customAdditionalQuestions).length > MAX_NUMBER_QUESTIONS
      ) {
        return res.status(403).json('Error. Too many custom questions.')
      }

      const decodedPollSlug = decodeURIComponent(pollSlug)

      await Poll.findOneAndUpdate(
        { slug: decodedPollSlug },
        { customAdditionalQuestions }
      )

      setSuccessfulJSONResponse(res)
      res.json(true)
    } catch (error) {
      console.log(error)
      return res.status(403).json(error)
    }
  })

export default router
