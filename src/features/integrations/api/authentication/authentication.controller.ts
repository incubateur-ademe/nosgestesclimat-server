import { StatusCodes } from 'http-status-codes'
import { config } from '../../../../config'
import { tsRestServer } from '../../../../core/ts-rest'
import logger from '../../../../logger'
import authenticationContract from './authentication.contract'
import { generateApiToken } from './authentication.service'

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
})

export default router
