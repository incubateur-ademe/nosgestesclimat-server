const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const simulationIds = req.body.simulationIds
  console.log(simulationIds)
  if (!simulationIds || simulationIds.length === 0) {
    return res
      .status(401)
      .send('Unauthorized. A value for simulationIds must be provided.')
  }
  let groupsFound

  await Group.find({
    'participants.id': {
      $in: simulationIds,
    },
  })
    .populate('administrator')
    .populate('participants')
    .exec(function (err, groups) {
      if (err) return next(err)

      groupsFound = groups.filter(function (group) {
        return simulationIds.includes(group.participants)
      })
    })

  setSuccessfulJSONResponse(res)

  res.json(groupsFound)
})

module.exports = router
