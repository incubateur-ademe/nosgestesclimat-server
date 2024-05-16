import { HydratedDocument } from 'mongoose'
import express from 'express'
import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { unformatSimulation } from '../../helpers/simulation/unformatSimulation'
import { SimulationType } from '../../schemas/SimulationSchema'
import { handleComputeResultsIfNone } from '../../helpers/simulation/handleComputeResultsIfNone'

const router = express.Router()

/**
 * Fetch a group
 * It requires a groupId
 */
router.route('/').post(async (req, res) => {
  const groupId = req.body.groupId

  if (!groupId) {
    return res.status(500).send('Error. A groupId must be provided.')
  }

  try {
    const group = await Group.findById(groupId).populate({
      path: 'participants',
      populate: {
        path: 'simulation',
        match: { progression: 1 },
      },
    })

    // If no group is found, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    const groupObject = group.toObject()

    // Unformat simulations
    groupObject.participants = groupObject.participants.map((participant) => {
      return {
        ...participant,
        simulation: handleComputeResultsIfNone(
          participant.simulation as unknown as HydratedDocument<SimulationType>
        ),
      }
    }) as any

    setSuccessfulJSONResponse(res)

    res.json(groupObject)

    console.log(`Group fetched: ${groupId}`)
  } catch (error) {
    res.status(500).send('Error. Group not found.')
  }
})

export default router
