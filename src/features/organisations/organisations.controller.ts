import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import {
  COOKIE_NAME,
  COOKIES_OPTIONS,
} from '../authentication/authentication.service'
import { OrganisationCreatedEvent } from './events/OrganisationCreated.event'
import { OrganisationUpdatedEvent } from './events/OrganisationUpdated.event'
import { addOrUpdateBrevoContact } from './handlers/add-or-update-brevo-contact'
import { addOrUpdateConnectContact } from './handlers/add-or-update-connect-contact'
import { sendOrganisationCreated } from './handlers/send-organisation-created'
import {
  createOrganisation,
  createPoll,
  deletePoll,
  fetchOrganisation,
  fetchOrganisations,
  updateOrganisation,
  updatePoll,
} from './organisations.service'
import {
  OrganisationCreateValidator,
  OrganisationFetchValidator,
  OrganisationPollCreateValidator,
  OrganisationPollDeleteValidator,
  OrganisationPollUpdateValidator,
  OrganisationsFetchValidator,
  OrganisationUpdateValidator,
} from './organisations.validator'

const router = express.Router()

EventBus.on(OrganisationCreatedEvent, sendOrganisationCreated)
EventBus.on(OrganisationCreatedEvent, addOrUpdateBrevoContact)
EventBus.on(OrganisationCreatedEvent, addOrUpdateConnectContact)

/**
 * Creates a new organisation
 */
router
  .route('/v1/')
  .post(
    authentificationMiddleware,
    validateRequest(OrganisationCreateValidator),
    async (req, res) => {
      try {
        const organisation = await createOrganisation({
          organisationDto: req.body,
          origin: req.get('origin') || config.origin,
          user: req.user!,
        })

        return res.status(StatusCodes.CREATED).json(organisation)
      } catch (err) {
        if (err instanceof ForbiddenException) {
          return res.status(StatusCodes.FORBIDDEN).send(err.message).end()
        }

        logger.error('Organisation creation failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

EventBus.on(OrganisationUpdatedEvent, addOrUpdateBrevoContact)
EventBus.on(OrganisationUpdatedEvent, addOrUpdateConnectContact)

/**
 * Updates a user organisation
 */
router
  .route('/v1/:organisationIdOrSlug')
  .put(
    authentificationMiddleware,
    validateRequest(OrganisationUpdateValidator),
    async ({ body, params, query, user }, res) => {
      try {
        const { organisation, token } = await updateOrganisation({
          params,
          organisationDto: body,
          code: query.code,
          user: user!,
        })

        if (token) {
          res.cookie(COOKIE_NAME, token, COOKIES_OPTIONS)
        }

        return res.status(StatusCodes.OK).json(organisation)
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        if (err instanceof ForbiddenException) {
          return res.status(StatusCodes.FORBIDDEN).send(err.message).end()
        }

        logger.error('Organisation update failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Returns organisations for a user
 */
router
  .route('/v1/')
  .get(
    authentificationMiddleware,
    validateRequest(OrganisationsFetchValidator),
    async ({ user }, res) => {
      try {
        const organisations = await fetchOrganisations(user!)

        return res.status(StatusCodes.OK).json(organisations)
      } catch (err) {
        logger.error('Organisations fetch failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Returns organisation for an id or a slug
 */
router
  .route('/v1/:organisationIdOrSlug')
  .get(
    authentificationMiddleware,
    validateRequest(OrganisationFetchValidator),
    async ({ params, user }, res) => {
      try {
        const organisation = await fetchOrganisation({ params, user: user! })

        return res.status(StatusCodes.OK).json(organisation)
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        logger.error('Organisation fetch failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Creates a new poll for an organisation
 */
router
  .route('/v1/:organisationIdOrSlug/polls')
  .post(
    authentificationMiddleware,
    validateRequest(OrganisationPollCreateValidator),
    async ({ body, params, user }, res) => {
      try {
        const poll = await createPoll({
          pollDto: body,
          user: user!,
          params,
        })

        return res.status(StatusCodes.CREATED).json(poll)
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        logger.error('Poll creation failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Updates a poll for an organisation
 */
router
  .route('/v1/:organisationIdOrSlug/polls/:pollIdOrSlug')
  .put(
    authentificationMiddleware,
    validateRequest(OrganisationPollUpdateValidator),
    async ({ body, params, user }, res) => {
      try {
        const poll = await updatePoll({
          pollDto: body,
          user: user!,
          params,
        })

        return res.status(StatusCodes.OK).json(poll)
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        logger.error('Poll update failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

/**
 * Deletes a poll for an organisation
 */
router
  .route('/v1/:organisationIdOrSlug/polls/:pollIdOrSlug')
  .delete(
    authentificationMiddleware,
    validateRequest(OrganisationPollDeleteValidator),
    async ({ params, user }, res) => {
      try {
        await deletePoll({
          user: user!,
          params,
        })

        return res.status(StatusCodes.NO_CONTENT).end()
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        logger.error('Poll delete failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

export default router
