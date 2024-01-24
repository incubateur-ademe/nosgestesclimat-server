const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupId = req.body.groupId
  const userId = req.body.userId
  const email = req.body.email

  if (!groupId) {
    return res.status(401).send('Error. A group id must be provided.')
  }

  if (!email && !userId) {
    return res.status(401).send('Error. An email or a userId must be provided.')
  }

  try {
    const groupFound = await Group.findById(groupId)
      .populate('administrator')
      .populate('participants.simulation')
      .populate('participants.simulation.user')

    if (!groupFound) {
      return res.status(404).send('Error. Group not found.')
    }

    const isAdministrator =
      groupFound.administrator.email === email ||
      groupFound.administrator.userId === userId

    if (isAdministrator) {
      await groupFound.delete()

      setSuccessfulJSONResponse(res)

      console.log('Group deleted')

      res.json('Group deleted')

      return
    }

    // User is listed as a participant
    const participantIndex = groupFound.participants.findIndex(
      (participant) =>
        participant.email === email || participant.userId === userId
    )
    // Delete participant from group if found
    if (participantIndex >= 0) {
      groupFound.participants = [...groupFound.participants].filter(
        (participant, index) => index !== participantIndex
      )

      await groupFound.save()

      setSuccessfulJSONResponse(res)

      console.log('Member deleted')

      res.json('Member deleted from group')
    }
  } catch (error) {
    return res.status(500).send('Error. An error occured.')
  }
})

module.exports = router
