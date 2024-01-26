import express from 'express'
import { Group } from '../../schemas/GroupSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const email = req.body.email
  const userId = req.body.userId

  if (!email && !userId) {
    return res
      .status(401)
      .send('Unauthorized. A value for email or userId must be provided.')
  }

  const groupsFound = await Group.find({
    $or: [
      {
        'participants.userId': userId,
      },
      {
        'participants.email': email,
      },
    ],
  }).populate('participants.simulation')

  if (!groupsFound) {
    return res.status(404).send('Error. No group found.')
  }

  setSuccessfulJSONResponse(res)

  res.json(groupsFound)
})

export default router
