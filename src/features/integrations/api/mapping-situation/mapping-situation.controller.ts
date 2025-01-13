import { StatusCodes } from 'http-status-codes'
import { tsRestServer } from '../../../../core/ts-rest'
import logger from '../../../../logger'
import mappingSituationContract from './mapping-situation.contract'
import { mapPartnerSituation } from './mapping-situation.service'

const router = tsRestServer.router(mappingSituationContract, {
  mapSituation: async ({ params, body }) => {
    try {
      return {
        body: await mapPartnerSituation({
          partner: params.partner,
          mappingSituationDto: body,
        }),
        status: StatusCodes.OK,
      }
    } catch (err) {
      logger.error('Mapping Situation failed', err)

      return {
        body: {},
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      }
    }
  },
})

export default router
