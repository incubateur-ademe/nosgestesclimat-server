import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config'
import logger from '../../logger'
import { createSimulation } from './simulations.service'
import {
  SimulationCreateDto,
  SimulationCreateValidator,
} from './simulations.validator'

const router = express.Router()

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

export default router
