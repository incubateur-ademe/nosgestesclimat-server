import express from 'express'
import { deleteUserGroup } from '../../features/groups/groups.repository'
import logger from '../../logger'
import { Group } from '../../schemas/GroupSchema'
import { Simulation } from '../../schemas/SimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

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
    const group = await Group.findById(groupId)

    // If no group is found, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    // Check if the user is the group administrator. If not, we return an error
    const isAdministrator = group.administrator?.userId === userId
    if (!isAdministrator) {
      return res.status(401).send('Error. You are not the group administrator.')
    }

    // We delete the group from the simulations of the participants
    for (const participant of group.participants) {
      const simulation = await Simulation.findById(participant.simulation)
      if (simulation) {
        simulation.groups = simulation.groups?.filter(
          (group) => group !== groupId
        )
        await simulation.save()
      }
    }

    // We delete the group
    await Promise.all([
      group.delete(),
      deleteUserGroup({
        groupId,
        userId,
      }).catch((error) =>
        logger.error('postgre Groups replication failed', error)
      ),
    ])

    setSuccessfulJSONResponse(res)

    res.send(`Group deleted: ${groupId}`)

    console.log(`Group deleted: ${groupId}`)
  } catch (error) {
    console.log('Error while deleting group: ', error)
    return res.status(500).send('Error. An error occured.')
  }
})

/**
 * @deprecated should use features/groups instead
 */
export default router
