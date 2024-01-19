const express = require('express')
const Group = require('../schemas/GroupSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupId = req.body.groupId
  const userId = req.body.userId

  if (groupId == null || userId == null) {
    return next('Error. A group id and a user id must be provided.')
  }

  Group.findById(groupId, (error, groupFound) => {
    if (error) {
      return next(error)
    }

    // If user is owner, delete group
    if (groupFound.owner.userId === userId) {
      groupFound.delete((error, groupDeleted) => {
        if (error) {
          return next(error)
        }

        setSuccessfulJSONResponse(res)
        console.log('Group deleted')
        res.json('Group deleted')
      })
    } else {
      // If user is not owner, delete member from group
      groupFound.members = [...groupFound.members].filter(
        (member) => member.userId !== userId
      )
      groupFound.save((error) => {
        if (error) {
          return next(error)
        }

        setSuccessfulJSONResponse(res)
        console.log('Member deleted')
        res.json('Member deleted from group')
      })
    }
  })
})

module.exports = router
