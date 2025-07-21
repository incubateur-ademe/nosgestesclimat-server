import winston from 'winston'
import SentryTransport from 'winston-transport-sentry-node'
import { config } from './config.js'

const { combine, timestamp, json, errors } = winston.format

const transports: winston.transport[] = [new winston.transports.Console()]

if (config.thirdParty.sentry.dsn) {
  transports.push(
    new SentryTransport({
      sentry: {
        dsn: config.thirdParty.sentry.dsn,
        tracesSampleRate: 0.1,
        sampleRate: 0.1,
        debug: false,
      },
      level: 'error',
    })
  )
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: {
    service: 'server',
  },
  format: combine(timestamp(), json(), errors({ stack: true })),
  transports,
})

export default logger
