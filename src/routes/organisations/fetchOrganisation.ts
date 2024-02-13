import express, { Request, Response } from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router
  .use(authentificationMiddleware)
  .post('/', async (req: Request, res: Response) => {
    const email = req.body.email

    if (!email) {
      return res.status(403).json('No owner email provided.')
    }

    try {
      const organisationFound = await Organisation.findOne({
        'administrators.email': email,
      }).populate('polls')

      setSuccessfulJSONResponse(res)

      res.json(organisationFound)
    } catch (error) {
      res.status(403).json('No organisation found.')
    }
  })

export default router
