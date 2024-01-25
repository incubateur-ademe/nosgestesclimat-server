const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupId = req.body.groupId
  const email = req.body.email
  const simulationId = req.body.simulationId

  if (!groupId) {
    return res.status(401).send('Error. A group id must be provided.')
  }

  if (!email) {
    return res.status(401).send('Error. An email must be provided.')
  }

  try {
    const groupFound = await Group.findById(groupId)
      .populate('administrator')
      .populate('participants')

    if (!groupFound) {
      return res.status(404).send('Error. Group not found.')
    }

    // User is listed as a participant
    const participantIndex = groupFound.participants.findIndex(
      (participant) =>
        participant.email === email || participant.id === simulationId
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
    } else {
      return res.status(401).send('Error. You are not a member of this group.')
    }
  } catch (error) {
    return res.status(500).send('Error. An error occured.')
  }
})

module.exports = router
