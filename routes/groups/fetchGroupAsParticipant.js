const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').get(async (req, res) => {
  const simulationId = req.body.simulationId

  if (!simulationId) {
    return res
      .status(401)
      .send('Unauthorized. A value for simulationIds must be provided.')
  }

  const groupsFound = await Group.find({
    'participants.id': simulationId,
  })
    .populate('administrator')
    .populate('participants')

  setSuccessfulJSONResponse(res)

  res.json(groupsFound)
})

module.exports = router
