import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../../config.js'
import { isNetworkOrTimeoutOrRetryableError } from '../../../core/typeguards/isRetryableAxiosError.js'

const { siteId, token, url } = config.thirdParty.matomo.beta

export const matomo = axios.create({
  baseURL: url,
  method: 'post',
  headers: {
    'content-type': 'application/json',
  },
  params: {
    idSite: siteId,
    format: 'json',
    module: 'API',
  },
  timeout: 60000,
})

matomo.interceptors.request.use((req) => {
  req.data = JSON.stringify({
    token_auth: token,
  })

  return req
})

axiosRetry(matomo, {
  retryCondition: isNetworkOrTimeoutOrRetryableError,
  retryDelay: () => 200,
  shouldResetTimeout: true,
})
