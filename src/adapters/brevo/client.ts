import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../config'
import { isNetworkOrTimeoutOrRetryableError } from '../../core/typeguards/isRetryableAxiosError'
import { TemplateIds } from './constant'

const brevo = axios.create({
  baseURL: config.thirdParty.brevo.url,
  headers: {
    'api-key': config.thirdParty.brevo.apiKey,
  },
  timeout: 1000,
})

axiosRetry(brevo, {
  retryCondition: isNetworkOrTimeoutOrRetryableError,
  retryDelay: () => 200,
  shouldResetTimeout: true,
})

export const sendVerificationCodeEmail = ({
  email,
  code,
}: {
  email: string
  code: string
}) => {
  return brevo.post('/v3/smtp/email', {
    to: [
      {
        name: email,
        email,
      },
    ],
    templateId: TemplateIds.VERIFICATION_CODE,
    params: {
      VERIFICATION_CODE: code,
    },
  })
}
