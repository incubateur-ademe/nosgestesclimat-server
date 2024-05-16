import express from 'express'
import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

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

    const participantsWithUnformatedSimulation = [
      ...groupObject.participants,
    ].map((participant) => {
      return {
        ...participant,
        simulation: participant.simulation as any,
      }
    })

    groupObject.participants = participantsWithUnformatedSimulation as any

    setSuccessfulJSONResponse(res)

    res.json(group)

    console.log(`Group fetched: ${groupId}`)
  } catch (error) {
    res.status(500).send('Error. Group not found.')
  }
})

export default router
