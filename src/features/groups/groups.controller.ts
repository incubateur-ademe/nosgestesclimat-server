import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import logger from '../../logger'
import { createGroup, updateGroup } from './groups.service'
import { GroupCreateValidator, GroupUpdateValidator } from './groups.validator'

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

/**
 * Updates a user group
 */
router
  .route('/:userId/:groupId')
  .put(validateRequest(GroupUpdateValidator), async (req, res) => {
    try {
      const group = await updateGroup(req.params, req.body)

      return res.status(StatusCodes.OK).json(group)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('Group update failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
