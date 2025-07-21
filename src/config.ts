import dotenv from 'dotenv'
import { ensureEnvVar } from './utils/os.js'

if (process.env.NODE_ENV === 'development') {
  dotenv.config({ quiet: true })
}

export const config = {
  env: ensureEnvVar(
    process.env.NODE_ENV,
    'development' as 'development' | 'production' | 'test'
  ),
  get serverUrl() {
    return ensureEnvVar(
      process.env.SERVER_URL,
      config.env === 'development'
        ? 'http://localhost:3001'
        : 'https://server.nosgestesclimat.fr'
    )
  },
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
    job: {
      secret: ensureEnvVar(process.env.JOB_SECRET, ''),
    },
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
      beta: {
        url: ensureEnvVar(
          process.env.MATOMO_BETA_URL,
          'https://stats.beta.gouv.fr'
        ),
        token: ensureEnvVar(process.env.MATOMO_BETA_TOKEN, ''),
        siteId: ensureEnvVar(process.env.MATOMO_BETA_SITE_ID, '20'),
      },
      data: {
        url: ensureEnvVar(
          process.env.MATOMO_DATA_URL,
          'https://stats.data.gouv.fr'
        ),
        token: ensureEnvVar(process.env.MATOMO_DATA_TOKEN, ''),
        siteId: ensureEnvVar(process.env.MATOMO_DATA_SITE_ID, '153'),
      },
    },
    redis: {
      url: ensureEnvVar(process.env.REDIS_URL, 'redis://localhost:6379'),
    },
    scaleway: {
      accessKeyId: ensureEnvVar(process.env.SCALEWAY_ACCESS_KEY_ID, ''),
      secretAccessKey: ensureEnvVar(process.env.SCALEWAY_SECRET_ACCESS_KEY, ''),
      bucket: ensureEnvVar(process.env.SCALEWAY_BUCKET, ''),
      endpoint: ensureEnvVar(
        process.env.SCALEWAY_ENDPOINT,
        'https://s3.fr-par.scw.cloud'
      ),
      region: ensureEnvVar(process.env.SCALEWAY_REGION, 'fr-par'),
      rootPath: ensureEnvVar(process.env.SCALEWAY_ROOT_PATH, 'ngc'),
    },
    sentry: {
      dsn: ensureEnvVar(process.env.SENTRY_DSN, ''),
    },
    twoTons: {
      url: ensureEnvVar(process.env.TWO_TONS_URL, ''),
      bearerToken: ensureEnvVar(process.env.TWO_TONS_BEARER_TOKEN, ''),
    },
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
    ? ['http://localhost:3000']
    : [
        'http://localhost:3000',
        'https://nosgestesclimat.fr',
        'https://preprod.nosgestesclimat.fr',
        /\.osc-fr1\.scalingo\.io$/,
        /\.vercel\.app$/,
      ]
