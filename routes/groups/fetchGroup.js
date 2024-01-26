const express = require('express')
const mongoose = require('mongoose')
const Group = require('../../schemas/GroupSchema')

const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').get(async (req, res, next) => {
  const groupId = req.params.groupId

  if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
    return res
      .status(500)
      .send('Unauthorized. A valid group id must be provided.')
  }

  try {
    const groupFound = await Group.findById(groupId).populate(
      'participants.simulation'
    )

    setSuccessfulJSONResponse(res)

    res.json(groupFound)
  } catch (error) {
    res.status(500).send('Error. Group not found.')
  }
})

module.exports = router
