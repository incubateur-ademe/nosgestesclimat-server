import { init, setupExpressErrorHandler } from '@sentry/node'
import type { Express } from 'express'

export const initSentry = () =>
  init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0, // 100%
  })

export const setupErrorHandler = (app: Express) => setupExpressErrorHandler(app)
