const express = require('express')
const mongoose = require('mongoose')
const connectdb = require('../../scripts/initDatabase')
const Group = require('../../schemas/GroupSchema')

const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').get((req, res, next) => {
  const groupId = req.params.groupId

  if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
    res.status(500).json({
      status: false,
      error: 'Unauthorized. A valid group name must be provided.',
    })

    return next('Unauthorized. A valid group name must be provided.')
  }

  connectdb.then(() => {
    const data = Group.findById(groupId).populate('owner')

    data.then((group) => {
      setSuccessfulJSONResponse(res)
      res.json(group)
    })
  })
})

module.exports = router
