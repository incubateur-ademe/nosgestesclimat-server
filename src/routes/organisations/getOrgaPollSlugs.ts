import type { Request, Response } from 'express'
import express from 'express'

import type { HydratedDocument } from 'mongoose'
import { Organisation } from '../../schemas/OrganisationSchema'
import type { PollType } from '../../schemas/PollSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.get('/:orgaSlug?', async (req: Request, res: Response) => {
  const orgaSlug = req.params.orgaSlug

  const decodedSlug = decodeURIComponent(orgaSlug)

  if (!orgaSlug) {
    return res.status(403).json('No orgaSlug provided.')
  }

  try {
    const organisationFound = await Organisation.findOne({
      slug: decodedSlug,
    }).populate('polls')

    if (!organisationFound) {
      return res.status(403).json('No organisation found.')
    }

    setSuccessfulJSONResponse(res)

    res.json(
      (organisationFound.polls as unknown as HydratedDocument<PollType>[]).map(
        (poll) => poll.slug
      )
    )
  } catch (error) {
    console.warn(error)
    res.status(403).json('No organisation found.')
  }
})

/**
 * @deprecated should use features/organisations instead
 */
export default router
