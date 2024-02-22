import express, { Request, Response } from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Group, GroupType } from '../../schemas/GroupSchema'

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
  // If no groupIds is provided, we return an error
  if (!groupIds) {
    return res.status(500).json('Error. A groupIds must be provided.')
  }

  try {
    const groups: GroupType[] = []

    for (const groupId of groupIds) {
      const group = await Group.findById(groupId)
      // If a group is found and the user is a part of it, we add it to the list of groups
      if (group && group.participants.find((participant) => participant.userId === userId)) {
        groups.push(group)
      }
    }

    setSuccessfulJSONResponse(res)

    res.json(groups)

    console.log(`Groups fetched: ${groupIds.join(', ')}`)
  } catch (error) {
    return res.status(500).send('Error while fetching groups')
  }
})

export default router
