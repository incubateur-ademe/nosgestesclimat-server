import { StatusCodes } from 'http-status-codes'
import { config } from '../../../../config'
import { EntityNotFoundException } from '../../../../core/errors/EntityNotFoundException'
import { asyncValidateRequestBody } from '../../../../core/middlewares/asyncValidateRequestBody'
import { tsRestServer } from '../../../../core/ts-rest'
import logger from '../../../../logger'
import authenticationContract, {
  AsyncRefreshApiTokenRequestDto,
} from './authentication.contract'
import {
  exchangeCredentialsForToken,
  generateApiToken,
  generateAuthenticationMiddleware,
  refreshApiToken,
} from './authentication.service'

const router = tsRestServer.router(authenticationContract, {
  generateApiToken: async ({ body, req }) => {
    try {
      await generateApiToken({
        generateApiTokenDto: body,
        origin: req.get('origin') || config.origin,
      })

      return {
        body: {
          message:
            'If you are registered as a Nos Gestes Climat API user, an email has been sent to you. Please follow its instructions to recover your API token',
        },
        status: StatusCodes.CREATED,
      }
    } catch (e) {
      logger.error('API token generation failed', e)
      return {
        body: {},
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      }
    }
  },
  recoverApiToken: async ({ query }) => {
    try {
      return {
        body: await exchangeCredentialsForToken(query),
        status: StatusCodes.OK,
      }
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return {
          body: err.message,
          status: StatusCodes.NOT_FOUND,
        }
      }

      logger.error('Recover API token failed', err)
      return {
        body: {},
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      }
    }
  },
  refreshApiToken: {
    middleware: [
      generateAuthenticationMiddleware({
        passIfExpired: true,
      }),
      asyncValidateRequestBody(AsyncRefreshApiTokenRequestDto),
    ],
    handler: async ({ req }) => {
      return {
        body: await refreshApiToken({ apiUser: req.apiUser! }),
        status: StatusCodes.OK,
      }
    },
  },
})

export default router
