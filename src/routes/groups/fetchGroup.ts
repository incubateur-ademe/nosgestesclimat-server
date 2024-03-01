import express from 'express'
import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { updateGroupWithComputedResults } from "../../helpers/groups/updateGroupWithComputedResults"

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
    const group = await Group.findById(groupId).populate(
      'participants.simulation'
    )

    // If no group is found, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    updateGroupWithComputedResults(group)

    setSuccessfulJSONResponse(res)

    res.json(group)

    console.log(`Group fetched: ${groupId}`)
  } catch (error) {
    res.status(500).send('Error. Group not found.')
  }
})

export default router
