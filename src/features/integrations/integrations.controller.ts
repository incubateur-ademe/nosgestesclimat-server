import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { SituationSchema } from '../simulations/simulations.validator'
import { exportSituation, getPartnerFeatures } from './integrations.service'
import {
  FetchExternalServiceValidator,
  SituationExportValidator,
} from './integrations.validator'

const router = express.Router()

/**
 * Returns details for an external Service
 */
router
  .route('/v1/:externalService')
  .get(validateRequest(FetchExternalServiceValidator), (req, res) => {
    return res
      .status(StatusCodes.OK)
      .json(getPartnerFeatures(req.params.externalService))
  })

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
