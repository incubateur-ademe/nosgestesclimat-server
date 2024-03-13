import express from 'express'
import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Simulation } from '../../schemas/SimulationSchema'

const router = express.Router()

/**
 * Deletes a group.
 * It requires a groupId and a userId.
 */
router.route('/').post(async (req, res) => {
  const groupId = req.body.groupId
  const userId = req.body.userId

  // If no groupId or userId is provided, we return an error
  if (!groupId) {
    return res.status(500).send('Error. A groupId must be provided.')
  }
  if (!userId) {
    return res.status(500).send('Error. A userId must be provided.')
  }

  try {
    const group = await Group.findById(groupId).populate(
      'participants.simulation'
    )

    // If no group is found, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    // Check if the user is the group administrator. If not, we return an error
    const isAdministrator = group.administrator.userId === userId
    if (!isAdministrator) {
      return res.status(401).send('Error. You are not the group administrator.')
    }

    // We delete the group from the simulations of the participants
    for (const participant of group.participants) {
      const simulation = await Simulation.findById(participant.simulation)
      if (simulation) {
        delete simulation.group
        await simulation.save()
      }
    }

    // We delete the group
    await group.delete()

    setSuccessfulJSONResponse(res)

    res.send(`Group deleted: ${groupId}`)

    console.log(`Group deleted: ${groupId}`)
  } catch (error) {
    console.log('Error while deleting group: ', error)
    return res.status(500).send('Error. An error occured.')
  }
})

export default router