const express = require('express')
const Group = require('../schemas/GroupSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')

const router = express.Router()

// Update group name
router.route('/').post(async (req, res, next) => {
  const _id = req.body._id
  const name = req.body.name

  if (_id == null) {
    return next('No group id provided.')
  }

  Group.findById(_id, (error, groupFound) => {
    if (error) {
      return next(error)
    }

    groupFound.name = name

    groupFound.save((error, groupSaved) => {
      if (error) {
        return next(error)
      }

      setSuccessfulJSONResponse(res)
      res.json(groupSaved)

      console.log('Group updated.')
    })
  })
})

module.exports = router
