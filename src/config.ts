import { ensureEnvVar } from './utils/os'

if (process.env.NODE_ENV === 'development') {
  require('dotenv').config()
}

export const config = {
  env: ensureEnvVar(
    process.env.NODE_ENV,
    'development' as 'development' | 'production' | 'test'
  ),
  get app() {
    const parentConfig = this
    return {
      get port() {
        return ensureEnvVar(
          process.env.PORT,
          Number,
          parentConfig.env === 'development' ? 3001 : 3000
        )
      },
    }
  },
  security: {
    jwt: {
      secret: ensureEnvVar(process.env.JWT_SECRET, ''),
    },
  },
  thirdParty: {
    brevo: {
      apiKey: ensureEnvVar(process.env.BREVO_API_KEY, ''),
    },
    matomo: {
      url: ensureEnvVar(process.env.MATOMO_URL, 'https://stats.data.gouv.fr'),
      token: ensureEnvVar(process.env.MATOMO_TOKEN, ''),
    },
  },
  mongo: {
    url: ensureEnvVar(
      process.env.MONGO_URL,
      'mongodb://127.0.0.1:27017/nosgestesclimat'
    ),
  },
}
