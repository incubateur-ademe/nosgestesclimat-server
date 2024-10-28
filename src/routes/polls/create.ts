import type { Request, Response } from 'express'
import express from 'express'
import { findUniquePollSlug } from '../../helpers/organisations/findUniquePollSlug'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Organisation } from '../../schemas/OrganisationSchema'
import { Poll } from '../../schemas/PollSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .route('/')
  .post(async (req: Request, res: Response) => {
    try {
      const organisationId = req.body.organisationId
      const defaultAdditionalQuestions = req.body.defaultAdditionalQuestions
      const customAdditionalQuestions = req.body.customAdditionalQuestions
      const name = req.body.name

      if (!organisationId || !name) {
        return res.status(403).json('Error. Missing required info.')
      }
      const organisation = await Organisation.findById(organisationId)

      if (!organisation) {
        return res.status(403).json('Error. Organisation not found.')
      }

      const uniqueSlug = await findUniquePollSlug(name)

      const pollCreated = new Poll({
        name,
        slug: uniqueSlug,
        simulations: [],
        defaultAdditionalQuestions,
        customAdditionalQuestions,
      })

      const newlySavedPoll = await pollCreated.save()

      organisation.polls.push(newlySavedPoll._id)

      await organisation.save()

      setSuccessfulJSONResponse(res)

      res.json(newlySavedPoll)

      console.log('New poll created')
    } catch (error) {
      console.warn(error)
      return res.status(403).json(error)
    }
  })

export default router
