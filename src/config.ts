import dotenv from 'dotenv'
import { ensureEnvVar } from './utils/os'

if (process.env.NODE_ENV === 'development') {
  dotenv.config()
}

export const config = {
  env: ensureEnvVar(
    process.env.NODE_ENV,
    'development' as 'development' | 'production' | 'test'
  ),
  origin: ensureEnvVar(process.env.ORIGIN, 'https://nosgestesclimat.fr'),
  get app() {
    return {
      get port() {
        return ensureEnvVar(
          process.env.PORT,
          Number,
          config.env === 'development' ? 3001 : 3000
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
    agir: {
      url: ensureEnvVar(process.env.AGIR_URL, ''),
      apiKey: ensureEnvVar(process.env.AGIR_API_KEY, ''),
    },
    brevo: {
      url: ensureEnvVar(process.env.BREVO_URL, 'https://api.brevo.com'),
      apiKey: ensureEnvVar(process.env.BREVO_API_KEY, ''),
    },
    matomo: {
      url: ensureEnvVar(process.env.MATOMO_URL, 'https://stats.data.gouv.fr'),
      token: ensureEnvVar(process.env.MATOMO_TOKEN, ''),
    },
    sentry: {
      dsn: ensureEnvVar(process.env.SENTRY_DSN, ''),
    },
  },
  mongo: {
    url: ensureEnvVar(process.env.MONGO_URL, 'mongodb://127.0.0.1:27017/ngc'),
  },
  connect: {
    url: ensureEnvVar(process.env.CONNECT_URL, ''),
    clientId: ensureEnvVar(process.env.CONNECT_CLIENT_ID, ''),
    clientSecret: ensureEnvVar(process.env.CONNECT_CLIENT_SECRET, ''),
  },
  organisationIdsWithCustomQuestionsEnabled: new Set(
    ensureEnvVar(
      process.env.ORGANISATION_IDS_WITH_CUSTOM_QUESTIONS_ENABLED,
      ''
    ).split(',')
  ),
}

export const origin =
  config.env === 'development'
    ? [
        'http://localhost:8080',
        'http://localhost:8888',
        'http://localhost:3000',
      ]
    : [
        'https://nosgestesclimat.fr',
        /\.vercel\.app$/,
        'http://localhost:3000',
        'https://sondages.nosgestesclimat.fr',
        'https://preprod.nosgestesclimat.fr',
        'https://nosgestesclimat.vercel.app',
        'https://nosgestesclimat-git-preprod-nos-gestes-climat.vercel.app',
      ]
