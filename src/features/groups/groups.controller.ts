import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { createGroup } from './groups.service'
import { GroupCreateValidator } from './groups.validator'

const router = express.Router()

/**
 * Creates a new group
 */
router
  .route('/')
  .post(validateRequest(GroupCreateValidator), async (req, res) => {
    try {
      const group = await createGroup(req.body)

      return res.status(StatusCodes.CREATED).json(group)
    } catch (err) {
      logger.error('Group creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
