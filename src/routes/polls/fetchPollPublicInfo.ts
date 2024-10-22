import type { Request, Response } from 'express'
import express from 'express'
import { getPollPublicInfos } from '../../helpers/organisations/getPollPublicInfos'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching a poll public infos
 */
router
  .route('/:pollSlug?')
  .get(
    async (req: Request & { params: { pollSlug: string } }, res: Response) => {
      const pollSlug = req.params.pollSlug

      if (!pollSlug) {
        return res.status(500).send('You must provide a poll slug')
      }

      try {
        const decodedSlug = decodeURIComponent(pollSlug)

        const pollPublicInfos = await getPollPublicInfos({
          pollSlug: decodedSlug,
        })

        if (!pollPublicInfos) {
          return res.status(404).send('This poll does not exist')
        }

        setSuccessfulJSONResponse(res)

        res.json(pollPublicInfos)
      } catch (error) {
        console.warn(error)
        return res.status(500).send('Error while fetching poll')
      }
    }
  )

/**
 * @deprecated should use features/organisations instead
 */
export default router
