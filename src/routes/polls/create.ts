import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Poll } from '../../schemas/PollSchema'
import { findUniquePollSlug } from '../../helpers/organisations/findUniquePollSlug'
import slugify from 'slugify'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { getSlug } from '../../utils/getSlug'

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
      console.log(error)
      return res.status(403).json(error)
    }
  })

export default router
