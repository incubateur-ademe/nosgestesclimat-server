import express, { Request } from 'express'
import mongoose from 'mongoose'

import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router
  .route('/')
  .get(async (req: Request & { params: { groupId: string } }, res) => {
    const groupId = req.params.groupId

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
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
