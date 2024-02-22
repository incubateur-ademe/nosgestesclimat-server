import express from 'express'
import { Group } from '../../schemas/GroupSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * This route updates a group.
 * It requires a groupId and a userId.
 * (It only accept the name for now)
 */
router.route('/').post(async (req, res) => {
  const groupId = req.body.groupId
  const userId = req.body.userId
  const name = req.body.name

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
    const isAdministrator = group.administrator.userId === userId
    if (!isAdministrator) {
      return res.status(401).send('Error. You are not the group administrator.')
    }

    // Update the group
    if (name) {
      group.name = name
    }

    const groupUpdated = await group.save()

    setSuccessfulJSONResponse(res)

    res.json(groupUpdated)

    console.log(`Group updated: ${groupId}`)
  } catch (error) {
    return res.status(500).send(error)
  }
})

export default router
