import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event'
import { sendSimulationUpserted } from './handlers/send-simulation-upserted'
import { updateBrevoContact } from './handlers/update-brevo-contact'
import {
  createSimulation,
  fetchSimulation,
  fetchSimulations,
} from './simulations.service'
import {
  SimulationCreateDto,
  SimulationCreateValidator,
  SimulationFetchValidator,
  SimulationsFetchValidator,
} from './simulations.validator'

const router = express.Router()

EventBus.on(SimulationUpsertedEvent, sendSimulationUpserted)
EventBus.on(SimulationUpsertedEvent, updateBrevoContact)

/**
 * Upserts a simulation
 */
router
  .route('/v1/')
  .post(validateRequest(SimulationCreateValidator), async (req, res) => {
    try {
      const simulation = await createSimulation({
        simulationDto: SimulationCreateDto.parse(req.body), // default values are not set in middleware
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
  .get(validateRequest(SimulationsFetchValidator), async ({ params }, res) => {
    try {
      const simulations = await fetchSimulations(params)

      return res.status(StatusCodes.OK).json(simulations)
    } catch (err) {
      logger.error('Simulations fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Returns simulations for a user and an id
 */
router
  .route('/v1/:userId/:simulationId')
  .get(validateRequest(SimulationFetchValidator), async ({ params }, res) => {
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
  })

export default router
