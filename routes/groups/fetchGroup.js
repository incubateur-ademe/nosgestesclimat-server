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
    res.status(500).json({
      status: false,
      error: 'Unauthorized. A valid group name must be provided.',
    })

    return next('Unauthorized. A valid group name must be provided.')
  }
  try {
    const groupFound = await Group.findById(groupId)
      .populate('administrators')
      .populate('participants')

    setSuccessfulJSONResponse(res)

    res.json(groupFound)
  } catch (error) {
    res.status(500).json('Error. Group not found.')
  }
})

module.exports = router
