import { config } from '../config'

export const axiosConf = {
  headers: {
    'api-key': config.thirdParty.brevo.apiKey,
  },
}
