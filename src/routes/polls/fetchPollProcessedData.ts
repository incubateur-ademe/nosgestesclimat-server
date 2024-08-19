import type { Request, Response } from 'express'
import express from 'express'
import type { HydratedDocument } from 'mongoose'

import { processPollData } from '../../helpers/organisations/processPollData'
import { Organisation } from '../../schemas/OrganisationSchema'
import type { PollType } from '../../schemas/PollSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router.get('/', async (req: Request, res: Response) => {
  const orgaSlug = decodeURIComponent(req.query.orgaSlug as string)
  const pollSlug = decodeURIComponent(req.query.pollSlug as string)
  const email = decodeURIComponent(formatEmail(req.query.email as string))
  const userId = decodeURIComponent(req.query.userId as string)

  if (!orgaSlug) {
    return res.status(403).json('No orgaSlug provided.')
  }

  const decodedSlug = decodeURIComponent(orgaSlug)
  const decodedPollSlug = decodeURIComponent(pollSlug)

  try {
    const organisationFound = await Organisation.findOne({
      slug: {
        $eq: decodedSlug,
      },
    }).populate({
      path: 'polls',
      populate: {
        path: 'simulations',
        match: { progression: 1 },
        populate: {
          path: 'user',
        },
      },
    })

    if (!organisationFound) {
      return res.status(403).json('No organisation found.')
    }

    const poll = (
      organisationFound.polls as unknown as HydratedDocument<PollType>[]
    ).find((poll) => poll.slug === pollSlug)

    const admin = organisationFound.administrators.find(
      (admin) => admin.email === email
    )

    const pollData = processPollData({
      simulations: poll?.simulations as unknown as SimulationType[],
      // Fix : the local userId is not synced with the one in the database
      userId: admin?.userId ?? userId ?? '',
    })

    setSuccessfulJSONResponse(res)

    res.json({
      ...pollData,
      organisationName: organisationFound?.name,
      name: poll?.name,
      slug: decodedPollSlug,
      createdAt: poll?.createdAt,
      defaultAdditionalQuestions: poll?.defaultAdditionalQuestions,
      customAdditionalQuestions: poll?.customAdditionalQuestions,
      isAdmin: !!admin,
    })
  } catch (error) {
    console.warn(error)
    res.status(500).json('Server error.')
  }
})

export default router
