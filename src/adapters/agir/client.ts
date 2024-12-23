import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../config'
import { isNetworkOrTimeoutOrRetryableError } from '../../core/typeguards/isRetryableAxiosError'
import type { SituationExportQueryParamsSchema } from '../../features/integrations/integrations.validator'
import type { SituationSchema } from '../../features/simulations/simulations.validator'

const agir = axios.create({
  baseURL: config.thirdParty.agir.url,
  headers: {
    apikey: config.thirdParty.agir.apiKey,
  },
  timeout: 1000,
})

axiosRetry(agir, {
  retryCondition: isNetworkOrTimeoutOrRetryableError,
  retryDelay: () => 200,
  shouldResetTimeout: true,
})

export const exportSituation = async (
  situation: SituationSchema,
  _: SituationExportQueryParamsSchema
) => {
  const {
    data: { redirect_url },
  } = await agir.post<{ redirect_url: string }>('/bilan/importFromNGC', {
    situation,
  })

  return {
    redirectUrl: redirect_url,
  }
}
