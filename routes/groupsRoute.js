const express = require('express')
const connectdb = require('../scripts/initDatabase')
const Group = require('../schemas/GroupSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')
const mongoose = require('mongoose')

const router = express.Router()

const groupKey = 'groupId'

router.route(`/:${groupKey}`).get((req, res, next) => {
  const groupId = req.params[groupKey]

  if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
    res.status(500).json({
      status: false,
      error: 'Unauthorized. A valid group name must be provided.'
    })

    return next('Unauthorized. A valid group name must be provided.')
  }

  connectdb.then(() => {
    const data = Group.findById(groupId)

    data.then((group) => {
      setSuccessfulJSONResponse(res)
      res.json(group)
    })
  })
})

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

router.route('/create').post(async (req, res, next) => {
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

  const groupCreated = new Group({
    name: groupName,
    emoji: groupEmoji,
    owner: { name: ownerName, email: ownerEmail, userId },
    members: [
      {
        name: ownerName,
        email: ownerEmail,
        userId,
        simulation,
        results
      }
    ]
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

router.route('/delete').post(async (req, res, next) => {
  const groupId = req.body.groupId
  const userId = req.body.userId

  if (groupId == null || userId == null) {
    return next('Error. A group id and a user id must be provided.')
  }

  Group.findById(groupId, (error, groupFound) => {
    if (error || !groupFound) {
      return next(error)
    }

    // If user is owner, delete group
    if (groupFound?.owner?.userId === userId) {
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

// Update group name
router.route('/update').post(async (req, res, next) => {
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

// Update results and simulation
router.route('/update-member').post(async (req, res, next) => {
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
