import express, { Request, Response } from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { PollPublicInfo } from '../../types/types'
import { getPollPublicInfos } from '../../helpers/organizations/getPollPublicInfos'

const router = express.Router()

/**
 * Fetching multiple polls public infos
 */
router.post('/', async (req: Request, res: Response) => {
  const pollsSlug = req.body.polls

  if (!pollsSlug || !pollsSlug.length) {
    return res.status(500).json('You must provide at least one poll slug')
  }

  try {
    const pollsPublicInfos: PollPublicInfo[] = []

    for (const pollSlug of pollsSlug) {
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
