import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'
import { Poll } from '../../schemas/PollSchema'

const router = express.Router()

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const pollSlug = req.body.pollSlug
    const orgaSlug = req.body.orgaSlug
    const email = req.body.email

    if (!pollSlug || !orgaSlug) {
      return res.status(403).json('Error. Missing required info.')
    }

    const organisationFound = await Organisation.findOne({
      slug: orgaSlug,
      // User should be an admin
      administrators: { $in: [email] },
    })

    if (!organisationFound) {
      return res
        .status(403)
        .json('Error. Organisation not found or user is not an admin.')
    }

    const poll = await Poll.findOne({ slug: pollSlug })

    if (!poll) {
      return res.status(403).json('Error. Poll not found.')
    }

    await poll.delete()

    setSuccessfulJSONResponse(res)
    res.json(true)
  } catch (error) {
    console.log(error)
    return res.status(403).json(error)
  }
})

export default router
