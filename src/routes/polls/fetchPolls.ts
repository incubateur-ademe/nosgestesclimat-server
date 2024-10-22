import type { Request, Response } from 'express'
import express from 'express'

import { getPollPublicInfos } from '../../helpers/organisations/getPollPublicInfos'
import type { PollPublicInfo } from '../../types/types'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

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
      const decodedSlug = decodeURIComponent(pollSlug)
      const pollPublicInfos = await getPollPublicInfos({
        pollSlug: decodedSlug,
      })
      if (pollPublicInfos) {
        pollsPublicInfos.push(pollPublicInfos)
      }
    }

    setSuccessfulJSONResponse(res)

    res.json(pollsPublicInfos)
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while fetching poll')
  }
})

/**
 * @deprecated should use features/organisations instead
 */
export default router
