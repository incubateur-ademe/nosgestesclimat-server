import { StatusCodes } from 'http-status-codes'
import { EntityNotFoundException } from '../../../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../../../core/errors/ForbiddenException'
import { tsRestServer } from '../../../../core/ts-rest'
import logger from '../../../../logger'
import { generateAuthenticationMiddleware } from '../authentication/authentication.service'
import emailWhitelistContract from './email-whitelist.contract'
import { createEmailWhitelist } from './email-whitelist.service'

const router = tsRestServer.router(emailWhitelistContract, {
  createEmailWhitelist: {
    middleware: [generateAuthenticationMiddleware()],
    handler: async ({ body, req }) => {
      try {
        return {
          body: await createEmailWhitelist({
            emailWhitelistDto: body,
            userScopes: req.apiUser!.scopes,
          }),
          status: StatusCodes.CREATED,
        }
      } catch (err) {
        if (err instanceof ForbiddenException) {
          return {
            body: err.message,
            status: StatusCodes.FORBIDDEN,
          }
        }

        if (err instanceof EntityNotFoundException) {
          return {
            body: err.message,
            status: StatusCodes.NOT_FOUND,
          }
        }

        logger.error('Email Whitelist creation failed', err)
        return {
          body: {},
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }
      }
    },
  },
})

export default router
