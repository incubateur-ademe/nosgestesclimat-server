import express from 'express'
import { Group } from '../../schemas/GroupSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { User } from '../../schemas/UserSchema'
import { handleDeleteGroupForAllParticipants } from '../../helpers/queries/handleDeleteGroupForAllParticipants'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const groupId = req.body.groupId
  const email = req.body.email

  if (!groupId) {
    return res.status(401).send('Error. A group id must be provided.')
  }

  if (!email) {
    return res.status(401).send('Error. An email must be provided.')
  }

  try {
    const groupFound = await Group.findById(groupId)

    if (!groupFound) {
      return res.status(404).send('Error. Group not found.')
    }

    const isAdministrator = groupFound.administrator?.email === email

    if (isAdministrator) {
      // Delete for all participants the group id from their list of groups
      await handleDeleteGroupForAllParticipants({
        groupId,
        res,
      })

      // Delete the group
      await groupFound.delete()

      setSuccessfulJSONResponse(res)

      console.log('Group deleted')

      res.json('Group deleted')

      return
    } else {
      return res.status(401).send('Error. You are not the group administrator.')
    }
  } catch (error) {
    return res.status(500).send('Error. An error occured.')
  }
})

export default router
