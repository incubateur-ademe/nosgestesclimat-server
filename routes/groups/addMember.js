const express = require('express')
const Group = require('../schemas/GroupSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/add-member').post(async (req, res, next) => {
  const _id = req.body._id
  const member = req.body.member

  if (_id == null) {
    return next('No group id provided.')
  }

  Group.findById(_id, (error, groupFound) => {
    if (error) {
      return next(error)
    }

    groupFound.members.push(member)

    groupFound.save((error, groupSaved) => {
      if (error) {
        return next(error)
      }

      setSuccessfulJSONResponse(res)
      res.json(groupSaved)

      console.log('New member added to group: ', groupSaved.name)
    })
  })
})

module.exports = router
