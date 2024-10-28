import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { config } from '../../config'

const router = express.Router()

router
  .route('/:slug?')
  .get(async (req: Request & { params: { slug: string } }, res: Response) => {
    try {
      const slug = req.params.slug

      if (!slug) {
        return res.status(403).json('Error. A slug must be provided.')
      }

      const decodedSlug = decodeURIComponent(slug)

      const organisationFound = await Organisation.findOne({
        slug: decodedSlug,
      })

      if (!organisationFound) {
        return res.status(403).json('Error. Organisation not found.')
      }

      setSuccessfulJSONResponse(res)

      // Verify if the organisation is authorised to use custom questions
      if (
        config.organisationIdsWithCustomQuestionsEnabled?.includes(
          organisationFound._id.toString()
        )
      ) {
        res.json(true)
      } else {
        res.json(false)
      }
    } catch (error) {
      return res.status(500).json(error)
    }
  })

export default router
