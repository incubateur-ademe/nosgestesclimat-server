import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import logger from '../../logger'
import {
  createGroup,
  createParticipant,
  deleteGroup,
  fetchGroup,
  fetchGroups,
  removeParticipant,
  updateGroup,
} from './groups.service'
import {
  GroupCreateValidator,
  GroupDeleteValidator,
  GroupFetchValidator,
  GroupsFetchValidator,
  GroupUpdateValidator,
  ParticipantCreateValidator,
  ParticipantDeleteValidator,
} from './groups.validator'

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

/**
 * Adds a participant to a group (participant joins)
 */
router
  .route('/:groupId/participants')
  .post(validateRequest(ParticipantCreateValidator), async (req, res) => {
    try {
      const participant = await createParticipant(req.params, req.body)

      return res.status(StatusCodes.CREATED).json(participant)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('Participant creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Removes a participant from a group (participant leaves)
 */
router
  .route('/:userId/:groupId/participants/:participantId')
  .delete(validateRequest(ParticipantDeleteValidator), async (req, res) => {
    try {
      await removeParticipant(req.params)

      return res.status(StatusCodes.NO_CONTENT).end()
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      if (err instanceof ForbiddenException) {
        return res.status(StatusCodes.FORBIDDEN).send(err.message).end()
      }

      logger.error('Participant deletion failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Returns groups for a user
 */
router
  .route('/:userId')
  .get(
    validateRequest(GroupsFetchValidator),
    async ({ params, query }, res) => {
      try {
        const groups = await fetchGroups(params, query)

        return res.status(StatusCodes.OK).json(groups)
      } catch (err) {
        logger.error('Groups fetch failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Returns group for a user and an id
 */
router
  .route('/:userId/:groupId')
  .get(validateRequest(GroupFetchValidator), async ({ params }, res) => {
    try {
      const group = await fetchGroup(params)

      return res.status(StatusCodes.OK).json(group)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('Group fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Deletes group for a user and an id
 */
router
  .route('/:userId/:groupId')
  .delete(
    validateRequest(GroupDeleteValidator),
    async ({ params: { userId, groupId } }, res) => {
      try {
        await deleteGroup({ userId, groupId })

        return res.status(StatusCodes.NO_CONTENT).end()
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        logger.error('Group delete failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

export default router
