import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { SituationSchema } from '../simulations/simulations.validator'
import { exportSituation } from './integrations.service'
import { SituationExportValidator } from './integrations.validator'

const router = express.Router()

/**
 * Exports situation to an external Service
 */
router
  .route('/v1/:externalService/export-situation')
  .post(validateRequest(SituationExportValidator), async (req, res) => {
    try {
      const externalServiceRedirection = await exportSituation({
        externalService: req.params.externalService,
        situation: SituationSchema.parse(req.body),
        params: req.query,
      })

      return res.status(StatusCodes.OK).json(externalServiceRedirection)
    } catch (err) {
      logger.error('Situation export failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
