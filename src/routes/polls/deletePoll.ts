import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
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

      await Poll.deleteOne({ slug: decodedPollSlug })

      setSuccessfulJSONResponse(res)
      res.json(true)
    } catch (error) {
      return res.status(403).json(error)
    }
  })

export default router
