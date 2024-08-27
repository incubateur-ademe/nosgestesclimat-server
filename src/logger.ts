import winston from 'winston'
import SentryTransport from 'winston-transport-sentry-node'
import { config } from './config'

const { combine, colorize, timestamp, json, errors } = winston.format

const transports: winston.transport[] = [new winston.transports.Console()]

if (config.thirdParty.sentry.dsn) {
  transports.push(
    new SentryTransport({
      sentry: {
        dsn: config.thirdParty.sentry.dsn,
        enableTracing: false,
        debug: false,
        sampleRate: 0.1,
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
  format: combine(
    colorize({ all: true }),
    timestamp(),
    json(),
    errors({ stack: true })
  ),
  transports,
})

export default logger
