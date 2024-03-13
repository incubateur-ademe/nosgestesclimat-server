import { Request, Response } from 'express'

import express from 'express'
import mongoose from 'mongoose'

import EmailSimulation from '../../schemas/_legacy/EmailSimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
const router = express.Router()

router
  .route('/:id?')
  .get(async (req: Request & { params: { id: string } }, res: Response) => {
    if (!req.params.id) {
      return res.status(404).send('You must provide a simulation id')
    }

    let objectId
    try {
      objectId = new mongoose.Types.ObjectId(req.params.id)
    } catch (error) {
      return res.status(404).send('This id is not valid')
    }

    try {
      const simulation = await EmailSimulation.findOne({
        _id: objectId,
      })

      if (!simulation) {
        return res.status(404).send('This simulation does not exist')
      }

      setSuccessfulJSONResponse(res)

      res.json(simulation)
    } catch (error) {
      return res.status(500).send('Error while fetching simulation')
    }
  })

export default router
