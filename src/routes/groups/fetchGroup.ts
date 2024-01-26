import express, { Request } from 'express'
import mongoose, { mongo } from 'mongoose'

import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const groupId = req.body.groupId

  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    return res
      .status(500)
      .send('Unauthorized. A valid group id must be provided.')
  }

  try {
    const groupFound = await Group.findById(groupId).populate(
      'participants.simulation'
    )

    setSuccessfulJSONResponse(res)

    res.json(groupFound)
  } catch (error) {
    res.status(500).send('Error. Group not found.')
  }
})

export default router
