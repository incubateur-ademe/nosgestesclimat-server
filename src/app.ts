import type { Request } from 'express'
import express from 'express'
import morgan from 'morgan'
import requestIp from 'request-ip'

import { createExpressEndpoints } from '@ts-rest/express'
import { generateOpenApi } from '@ts-rest/open-api'
import cors from 'cors'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import { origin } from './config'
import authenticationController from './features/authentication/authentication.controller'
import verificationCodeController from './features/authentication/verification-codes.controller'
import groupsController from './features/groups/groups.controller'
import integrationsApiContract from './features/integrations/api/api.contract'
import integrationsApiController from './features/integrations/api/api.controller'
import integrationsController from './features/integrations/integrations.controller'
import modeleController from './features/modele/modele.controller'
import newslettersController from './features/newsletter/newsletter.controller'
import northstarRatingsController from './features/northstar-ratings/northstar-ratings.controller'
import organisationController from './features/organisations/organisations.controller'
import quizzAnswersController from './features/quizz-answers/quizz-answers.controller'
import simulationController from './features/simulations/simulations.controller'
import usersController from './features/users/users.controller'
import logger from './logger'
import getNewsletterSubscriptions from './routes/settings/getNewsletterSubscriptions'
import updateSettingsRoute from './routes/settings/updateSettings'
import statsRoute from './routes/stats/statsRoute'

const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())

app.use((req, _, next) => {
  req.requestParams = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  })

  return next()
})

app.use(
  cors({
    origin,
    credentials: true,
  })
)

app.use(requestIp.mw())

morgan.token('params', (req: Request) => req.requestParams)

morgan.token('ip', (req: Request) => JSON.stringify(req.clientIp))

app.use(
  morgan(
    '{"method":":method","url":":url","ip"::ip,"params"::params,"status":":status","resContentLength":":res[content-length]","reponseTime":":response-time ms"}',
    {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    }
  )
)

// Legacy routes
app.use('/get-stats', statsRoute)

// Deprecated routes
app.use('/update-settings', updateSettingsRoute)
app.use('/get-newsletter-subscriptions', getNewsletterSubscriptions)

// new API routes
app.use('/authentication', authenticationController)
app.use('/modele', modeleController)
app.use('/groups', groupsController)
app.use('/integrations', integrationsController)
app.use('/newsletters', newslettersController)
app.use('/northstar-ratings', northstarRatingsController)
app.use('/organisations', organisationController)
app.use('/quizz-answers', quizzAnswersController)
app.use('/simulations', simulationController)
app.use('/users', usersController)
app.use('/verification-codes', verificationCodeController)

createExpressEndpoints(
  integrationsApiContract,
  integrationsApiController,
  app,
  {
    logInitialization: false,
  }
)

const integrationsOpenApiDocument = generateOpenApi(
  integrationsApiContract,
  {
    info: {
      title: 'Integrations API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  {
    setOperationId: true,
    operationMapper: (operation, appRoute) => ({
      ...operation,
      ...(appRoute.metadata || {}),
    }),
  }
)

app.use(
  '/integrations-api/docs',
  swaggerUi.serve,
  swaggerUi.setup(integrationsOpenApiDocument)
)

export default app
