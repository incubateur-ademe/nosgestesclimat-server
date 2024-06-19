import express, { Request, Response } from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { PollType } from '../../schemas/PollSchema'
import { HydratedDocument } from 'mongoose'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.get('/:orgaSlug?', async (req: Request, res: Response) => {
  const orgaSlug = req.params.orgaSlug

  if (!orgaSlug) {
    return res.status(403).json('No orgaSlug provided.')
  }

  try {
    const organisationFound = await Organisation.findOne({
      slug: orgaSlug,
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
    res.status(403).json('No organisation found.')
  }
})

export default router
