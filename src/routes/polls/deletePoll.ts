import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'
import { Poll } from '../../schemas/PollSchema'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .route('/:pollSlug?')
  .delete(async (req: Request, res: Response) => {
    try {
      const pollSlug = req.params.pollSlug
      const orgaSlug = decodeURIComponent(req.query.orgaSlug as string)
      const email = decodeURIComponent(req.query.email as string)

      if (!pollSlug || !orgaSlug || !email) {
        return res.status(403).json('Error. Missing required info.')
      }

      const organisationFound = await Organisation.findOne({
        slug: orgaSlug,
        // User should be an admin
        administrators: { $elemMatch: { email } },
      })

      if (!organisationFound) {
        return res
          .status(403)
          .json('Error. Organisation not found or user is not an admin.')
      }

      await Poll.deleteOne({ slug: pollSlug })

      setSuccessfulJSONResponse(res)
      res.json(true)
    } catch (error) {
      return res.status(403).json(error)
    }
  })

export default router
