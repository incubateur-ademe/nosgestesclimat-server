import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import logger from '../../logger'
import { getModeleCountry } from './geolocation.service'
import { GeolocationFetchValidator } from './modele.validator'

const router = express.Router()

/**
 * Fetches country code according to IP address
 */
router
  .route('/v1/geolocation')
  .get(validateRequest(GeolocationFetchValidator), async (req, res) => {
    try {
      const country = getModeleCountry(req.clientIp)

      return res.status(StatusCodes.OK).json(country)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('Geolocation fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
