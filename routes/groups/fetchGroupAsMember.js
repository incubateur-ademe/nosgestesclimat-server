const express = require('express')
const connectdb = require('../scripts/initDatabase')
const Group = require('../schemas/GroupSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')

const router = express.Router()

const userIdkey = 'userId'

router.route(`/user-groups/:${userIdkey}`).get((req, res, next) => {
  const userId = req.params[userIdkey]

  if (!userId) {
    return next('Unauthorized. A valid user _id must be provided.')
  }

  connectdb.then(() => {
    const data = Group.find({ 'members.userId': userId })

    data.then((groups) => {
      setSuccessfulJSONResponse(res)
      res.json(groups)
    })
  })
})

module.exports = router
