import type { Request, Response } from 'express'
import express from 'express'

import type { GroupType } from '../../schemas/GroupSchema'
import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching groups of a user
 * It requires a userId and a list of groupIds
 */
router.post('/', async (req: Request, res: Response) => {
  const groupIds = req.body.groupIds
  const userId = req.body.userId

  // If no userId is provided, we return an error
  if (!userId) {
    return res.status(500).json('Error. A userId must be provided.')
  }

  try {
    let groupsOfUser: GroupType[] = []

    // If no groupIds are provided, we check if the user is a participant in any group
    if (!groupIds) {
      groupsOfUser = await Group.find({
        participants: { $elemMatch: { userId: userId } },
      })
    }

    // If it is provided, we check if the user is a participant in the provided groups
    if (groupIds) {
      const groups: GroupType[] = await Group.find({ _id: { $in: groupIds } })

      groupsOfUser = groups.filter((group) =>
        group.participants.find((participant) => participant.userId === userId)
      )
    }

    setSuccessfulJSONResponse(res)

    res.json(groupsOfUser)

    console.log(`Groups of user ${userId} fetched`)
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while fetching groups')
  }
})

export default router
