import express from 'express'
import { Group } from '../../schemas/GroupSchema'

import { prisma } from '../../adapters/prisma/client'
import logger from '../../logger'
import { Simulation } from '../../schemas/SimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * This route removes a participant from a group.
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

    // If there is no group associated with the groupId, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    const participant = group.participants.find(
      (participant) => participant.userId === userId
    )

    // If the user is not a participant of the group, we return an error
    if (!participant) {
      return res.status(404).send('Error. The user is not in the group.')
    }

    // We delete the group from the simulation of the participant
    const simulation = await Simulation.findById(participant.simulation)
    if (simulation) {
      simulation.groups = simulation.groups?.filter(
        (group) => group !== groupId
      )
      await simulation.save()
    }

    // We remove the user from the list of participants
    // @ts-expect-error 2740 filter like that is kind of weird
    group.participants = group.participants.filter(
      (participant) => participant.userId !== userId
    )

    await Promise.all([
      group.save(),
      prisma.groupParticipant
        .delete({
          where: {
            groupId_userId: {
              groupId,
              userId,
            },
          },
        })
        .catch((error) =>
          logger.error('postgre Groups replication failed', error)
        ),
    ])

    setSuccessfulJSONResponse(res)

    res.json(group)

    console.log(`User removed: ${userId} removed from group ${groupId}.`)
  } catch (error) {
    console.log(error)
    res.status(500).send(error)
  }
})

/**
 * @deprecated should use features/groups instead
 */
export default router
