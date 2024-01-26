import express from 'express'
import { Group } from '../../schemas/GroupSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

// Update group name
router.route('/').post(async (req, res, next) => {
  const _id = req.body._id
  const name = req.body.name
  const email = req.body.email

  if (!_id) {
    return res.status(401).send('No group id provided.')
  }

  if (!name) {
    return res.status(401).send('No group name provided.')
  }

  if (!email) {
    return res.status(401).send('No email provided.')
  }

  try {
    const groupFound = await Group.findOne({
      _id,
      'administrator.email': email,
    }).populate('participants.simulation')

    if (!groupFound) {
      return res.status(404).send('Group not found.')
    }

    groupFound.name = name

    const groupUpdated = await groupFound.save()

    setSuccessfulJSONResponse(res)

    res.json(groupUpdated)

    console.log('Group updated.')
  } catch (error) {
    return res.status(501).send(error)
  }
})

export default router
