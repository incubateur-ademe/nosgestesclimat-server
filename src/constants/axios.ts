import type { AxiosRequestConfig } from 'axios'
import { config } from '../config.js'

export const axiosConf: AxiosRequestConfig = {
  baseURL: config.thirdParty.brevo.url,
  headers: {
    'api-key': config.thirdParty.brevo.apiKey,
  },
}
