import type { Request, Response } from 'express'
import express from 'express'

import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Organisation } from '../../schemas/OrganisationSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router
  .use(authentificationMiddleware)
  .post('/', async (req: Request, res: Response) => {
    const email = formatEmail(req.body.email)
    const slug = req.body.slug

    const decodedSlug = decodeURIComponent(slug)

    if (!email) {
      return res.status(403).json('A valid email address must be provided.')
    }

    try {
      const organisationFound = await Organisation.findOne({
        'administrators.email': email,
        slug: decodedSlug,
      }).populate('polls')

      if (!organisationFound) {
        return res.status(403).json('No organisation found.')
      }

      setSuccessfulJSONResponse(res)

      res.json(organisationFound)
    } catch (error) {
      console.warn(error)
      res.status(403).json('No organisation found.')
    }
  })

/**
 * @deprecated should use features/organisations instead
 */
export default router
