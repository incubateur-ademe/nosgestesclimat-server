import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import logger from '../../logger.js'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware.js'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event.js'
import { publishRedisEvent } from './handlers/publish-redis-event.js'
import { sendSimulationUpserted } from './handlers/send-simulation-upserted.js'
import { syncUserDataAfterSimulationUpserted } from './handlers/sync-user-data-after-simulation-upserted.js'
import { updateBrevoContact } from './handlers/update-brevo-contact.js'
import {
  createSimulation,
  fetchSimulation,
  fetchSimulations,
} from './simulations.service.js'
import {
  SimulationCreateDto,
  SimulationCreateNewsletterList,
  SimulationCreateValidator,
  SimulationFetchValidator,
  SimulationsFetchValidator,
} from './simulations.validator.js'

const router = express.Router()

EventBus.on(SimulationUpsertedEvent, updateBrevoContact)
EventBus.on(SimulationUpsertedEvent, sendSimulationUpserted)
EventBus.on(SimulationUpsertedEvent, syncUserDataAfterSimulationUpserted)
EventBus.on(SimulationUpsertedEvent, publishRedisEvent)

/**
 * Upserts a simulation
 */
router
  .route('/v1/:userId')
  .post(validateRequest(SimulationCreateValidator), async (req, res) => {
    try {
      const simulation = await createSimulation({
        simulationDto: SimulationCreateDto.parse(req.body), // default values are not set in middleware
        newsletters: SimulationCreateNewsletterList.parse(
          req.query?.newsletters || []
        ),
        sendEmail: !!req.query?.sendEmail,
        params: req.params,
        origin: req.get('origin') || config.origin,
      })

      return res.status(StatusCodes.CREATED).json(simulation)
    } catch (err) {
      logger.error('Simulation creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Returns simulations for a user
 */
router
  .route('/v1/:userId')
  .get(
    authentificationMiddleware({ passIfUnauthorized: true }),
    validateRequest(SimulationsFetchValidator),
    async ({ params }, res) => {
      try {
        const simulations = await fetchSimulations(params)

        return res.status(StatusCodes.OK).json(simulations)
      } catch (err) {
        logger.error('Simulations fetch failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Returns simulations for a user and an id
 */
router
  .route('/v1/:userId/:simulationId')
  .get(
    authentificationMiddleware({ passIfUnauthorized: true }),
    validateRequest(SimulationFetchValidator),
    async ({ params }, res) => {
      try {
        const simulation = await fetchSimulation(params)

        return res.status(StatusCodes.OK).json(simulation)
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        logger.error('Simulation fetch failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

export default router
