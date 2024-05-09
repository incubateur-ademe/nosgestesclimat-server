import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'
import { Poll } from '../../schemas/PollSchema'

const router = express.Router()

const MAX_NUMBER_QUESTIONS = 4

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const pollSlug = req.body.pollSlug
    const orgaSlug = req.body.orgaSlug
    const customAdditionalQuestions = req.body.customAdditionalQuestions

    if (!pollSlug || !orgaSlug || !customAdditionalQuestions) {
      return res.status(403).json('Error. Missing required info.')
    }

    const organisationFound = await Organisation.findOne({
      slug: orgaSlug,
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

    if (Object.keys(customAdditionalQuestions).length > MAX_NUMBER_QUESTIONS) {
      return res.status(403).json('Error. Too many custom questions.')
    }

    await Poll.findOneAndUpdate(
      { slug: pollSlug },
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
