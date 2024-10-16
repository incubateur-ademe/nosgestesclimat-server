import type { VerifiedUser } from '@prisma/client'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../config'
import { isNetworkOrTimeoutOrRetryableError } from '../../core/typeguards/isRetryableAxiosError'
import logger from '../../logger'

/**
 * Connect url is a full url in the environment
 * We use a URL to extract the baseUrl here
 * safe to remove once env is updated
 */
export const baseURL = new URL(config.connect.url).origin

const connect = axios.create({
  baseURL,
  headers: {
    client_id: config.connect.clientId,
    client_secret: config.connect.clientSecret,
  },
  timeout: 1000,
})

axiosRetry(connect, {
  retryCondition: isNetworkOrTimeoutOrRetryableError,
  retryDelay: () => 200,
  shouldResetTimeout: true,
})

export const addOrUpdateContact = async ({
  email,
  name,
  position,
}: VerifiedUser) => {
  try {
    await connect.post('/api/v1/personnes', {
      email,
      nom: name,
      fonction: position,
      source: 'Nos gestes Climat',
    })
  } catch (err) {
    logger.warn('Connect(addOrUpdateContact): sync failed', err)
  }
}
