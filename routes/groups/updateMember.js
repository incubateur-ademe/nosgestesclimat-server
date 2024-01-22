const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

// Update results and simulation
router.route('/').post(async (req, res, next) => {
  const _id = req.body._id
  const memberUpdates = req.body.memberUpdates

  if (_id == null) {
    return next('No group id provided.')
  }

  Group.findById(_id, (error, groupFound) => {
    if (error) {
      return next(error)
    }

    const memberIndex = groupFound.members.findIndex(
      (m) => m.userId === memberUpdates.userId
    )

    if (memberIndex < 0) {
      return next('No member found matching this user id.')
    }

    groupFound.members[memberIndex].results = memberUpdates.results
    groupFound.members[memberIndex].simulation = memberUpdates.simulation

    groupFound.save((error, groupSaved) => {
      if (error) {
        return next(error)
      }

      setSuccessfulJSONResponse(res)
      res.json(groupSaved)

      console.log('Member updated.')
    })
  })
})

module.exports = router
