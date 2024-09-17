import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { OrganisationCreatedEvent } from './events/OrganisationCreated.event'
import { addOrUpdateBrevoContact } from './handlers/add-or-update-brevo-contact'
import { addOrUpdateConnectContact } from './handlers/add-or-update-connect-contact'
import { sendOrganisationCreated } from './handlers/send-organisation-created'
import { createOrganisation } from './organisations.service'
import { OrganisationCreateValidator } from './organisations.validator'

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

export default router
