const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

const userIdkey = 'userId'

router.route('/').get(async (req, res, next) => {
  const userId = req.params[userIdkey]

  if (!userId) {
    return res
      .status(401)
      .send('Unauthorized. A valid user _id must be provided.')
  }

  const groupsFound = await Group.find({
    'participants.simulation.user.userId': userId,
  })
    .populate('administrator')
    .populate('participants.simulation')
    .populate('participants.simulation.user')

  setSuccessfulJSONResponse(res)

  res.json(groupsFound)
})

module.exports = router
