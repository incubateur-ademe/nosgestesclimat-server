const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const getUserDocument = require('../../helpers/queries/getUserDocument')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupName = req.body.name
  const groupEmoji = req.body.emoji
  const ownerName = req.body.ownerName
  const ownerEmail = req.body.ownerEmail
  const simulation = req.body.simulation
  const results = req.body.results
  const userId = req.body.userId

  if (groupName == null) {
    return next('Error. A group name must be provided.')
  }

  // Get user document or create a new one
  const userDocument = getUserDocument({
    ownerEmail,
    ownerName,
    userId,
  })

  // Create a new Simulation document but what happens if the user already has one?
  // this brings up the risk of creating duplicate simulations

  const groupCreated = new Group({
    name: groupName,
    emoji: groupEmoji,
    administrator: userDocument._id,
    members: [
      {
        name: ownerName,
        email: ownerEmail,
        userId,
        simulation,
        results,
      },
    ],
  })

  groupCreated.save((error, groupSaved) => {
    if (error) {
      return next(error)
    }

    setSuccessfulJSONResponse(res)
    res.json(groupSaved)

    console.log('New group created: ', groupName)
  })
})

module.exports = router
