import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../../config.js'
import { isNetworkOrTimeoutOrRetryableError } from '../../../core/typeguards/isRetryableAxiosError.js'

const { siteId, token, url } = config.thirdParty.matomo.data

export const matomo = axios.create({
  baseURL: url,
  params: {
    idSite: siteId,
    format: 'json',
    module: 'API',
    token_auth: token,
  },
  timeout: 60000,
})

axiosRetry(matomo, {
  retryCondition: isNetworkOrTimeoutOrRetryableError,
  retryDelay: () => 200,
  shouldResetTimeout: true,
})
