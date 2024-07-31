import type { AxiosRequestConfig } from 'axios'
import { config } from '../config'

export const axiosConf: AxiosRequestConfig = {
  baseURL: config.thirdParty.brevo.url,
  headers: {
    'api-key': config.thirdParty.brevo.apiKey,
  },
}
