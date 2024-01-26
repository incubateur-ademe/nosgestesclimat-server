import express from 'express'
import { Group } from '../../schemas/GroupSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { User } from '../../schemas/UserSchema'
import { handleDeleteGroupForUser } from '../../helpers/queries/handleDeleteGroupFromUser'

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupId = req.body.groupId
  const email = req.body.email
  const userId = req.body.userId

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

    if (groupFound.administrator?.email === email) {
      return res
        .status(401)
        .send(
          'Error. You are the group administrator. You cannot leave the group.'
        )
    }

    // User is listed as a participant
    const participant = groupFound.participants.find(
      (participant) =>
        participant.email === email || participant.userId === userId
    )

    if (participant) {
      await handleDeleteGroupForUser({
        groupId,
        userId,
        email,
        res,
      })

      // Delete participant from group if found
      groupFound.participants.pull({ _id: participant._id })

      await groupFound.save()

      setSuccessfulJSONResponse(res)

      console.log('Member deleted')

      res.json('Member deleted from group')
    } else {
      return res.status(401).send('Error. You are not a member of this group.')
    }
  } catch (error) {
    return res.status(500).send('Error. An error occured.')
  }
})

export default router
