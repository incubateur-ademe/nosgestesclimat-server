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

  // If no groupId or userId is provided, we return an error
  if (!userId) {
    return res.status(500).json('Error. A userId must be provided.')
  }
  if (!groupIds) {
    return res.status(500).json('Error. A groupIds must be provided.')
  }

  try {
    const groups: GroupType[] = await Group.find({ _id: { '$in': groupIds }})

    const groupsOfUser = groups.filter((group) => group.participants.find((participant) => participant.userId === userId))
   
    setSuccessfulJSONResponse(res)

    res.json(groupsOfUser)

    console.log(`Groups fetched: ${groupIds.join(', ')}`)
  } catch (error) {
    return res.status(500).send('Error while fetching groups')
  }
})

export default router
