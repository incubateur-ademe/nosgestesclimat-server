import express, { Request, Response } from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { PollPublicInfo } from '../../types/types'
import { getPollPublicInfos } from '../../helpers/organisations/getPollPublicInfos'

const router = express.Router()

/**
 * Fetching multiple polls public infos
 */
router.post('/', async (req: Request, res: Response) => {
  const pollSlugs = req.body.polls

  if (!pollSlugs || !pollSlugs.length) {
    return res.status(500).json('You must provide at least one poll slug')
  }

  try {
    const pollsPublicInfos: PollPublicInfo[] = []

    for (const pollSlug of pollSlugs) {
      const pollPublicInfos = await getPollPublicInfos({ pollSlug })
      if (pollPublicInfos) {
        pollsPublicInfos.push(pollPublicInfos)
      }
    }

    setSuccessfulJSONResponse(res)

    res.json(pollsPublicInfos)
  } catch (error) {
    return res.status(500).send('Error while fetching poll')
  }
})

export default router
