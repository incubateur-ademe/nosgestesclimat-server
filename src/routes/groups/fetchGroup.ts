import express from 'express'
import type { GroupType, ParticipantType } from '../../schemas/GroupSchema'
import { Group } from '../../schemas/GroupSchema'
import { type SimulationType } from '../../schemas/SimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

type PopulatedParticipantType = Omit<ParticipantType, 'simulation'> & {
  simulation: SimulationType
}

type PopulatedGroupType = Omit<GroupType, 'participants'> & {
  participants: PopulatedParticipantType[]
}

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
    const group = await Group.findById(groupId)
      .populate<PopulatedGroupType>({
        path: 'participants',
        populate: {
          path: 'simulation',
        },
      })
      .lean()

    // If no group is found, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    setSuccessfulJSONResponse(res)

    res.json(group)

    console.log(`Group fetched: ${groupId}`)
  } catch (error) {
    console.warn(error)
    res.status(500).send('Error. Group not found.')
  }
})

/**
 * @deprecated should use features/groups instead
 */
export default router
