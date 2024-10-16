import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { GroupCreatedEvent } from './events/GroupCreated.event'
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
  GroupCreateDto,
  GroupCreateValidator,
  GroupDeleteValidator,
  GroupFetchValidator,
  GroupsFetchValidator,
  GroupUpdateValidator,
  ParticipantCreateDto,
  ParticipantCreateValidator,
  ParticipantDeleteValidator,
} from './groups.validator'
import { sendGroupCreated } from './handlers/send-group-created'

const router = express.Router()

EventBus.on(GroupCreatedEvent, sendGroupCreated)

/**
 * Creates a new group
 */
router
  .route('/v1/')
  .post(validateRequest(GroupCreateValidator), async (req, res) => {
    try {
      const group = await createGroup({
        groupDto: GroupCreateDto.parse(req.body), // default values are not set in middleware
        origin: req.get('origin') || config.origin,
      })

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
  .route('/v1/:userId/:groupId')
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
  .route('/v1/:groupId/participants')
  .post(validateRequest(ParticipantCreateValidator), async (req, res) => {
    try {
      const participant = await createParticipant({
        params: req.params,
        origin: req.get('origin') || config.origin,
        participantDto: ParticipantCreateDto.parse(req.body), // default values are not set in middleware
      })

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
  .route('/v1/:userId/:groupId/participants/:participantId')
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
  .route('/v1/:userId')
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
  .route('/v1/:userId/:groupId')
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
  .route('/v1/:userId/:groupId')
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
