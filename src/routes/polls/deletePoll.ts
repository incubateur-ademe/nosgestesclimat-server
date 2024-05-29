import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'
import { Poll } from '../../schemas/PollSchema'

const router = express.Router()

router.route('/:pollSlug?').delete(async (req: Request, res: Response) => {
  try {
    const pollSlug = req.params.pollSlug
    const orgaSlug = req.query.orgaSlug
    const email = req.query.email

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
