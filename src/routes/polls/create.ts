import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Poll } from '../../schemas/PollSchema'

const router = express.Router()

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const organisationId = req.body.organisationId
    const defaultAdditionalQuestions = req.body.defaultAdditionnalQuestions
    const customAdditionalQuestions = req.body.customAdditionnalQuestions
    const name = req.body.name

    if (!organisationId || !name) {
      return res.status(403).json('Error. Missing required info.')
    }
    const organisation = await Organisation.findById(organisationId)

    if (!organisation) {
      return res.status(403).json('Error. Organisation not found.')
    }

    const pollCreated = new Poll({
      simulations: [],
      defaultAdditionalQuestions,
      customAdditionalQuestions,
    })

    const newlySavedPoll = await pollCreated.save()

    organisation.polls.push(newlySavedPoll._id)

    await organisation.save()

    setSuccessfulJSONResponse(res)

    res.json({ pollId: newlySavedPoll._id })

    console.log('New poll created')
  } catch (error) {
    console.log(error)
    return res.status(403).json(error)
  }
})

export default router
