import express from 'express'
import morgan from 'morgan'

import cors from 'cors'
import answersRoute from './routes/_legacy/answersRoute'
import ratingsRoute from './routes/_legacy/ratingsRoute'
import simulationRoute from './routes/_legacy/simulationRoute'
import surveysRoute from './routes/_legacy/surveysRoute'
import statsRoute from './routes/stats/statsRoute'

// Authentication route
import authenticationController from './features/authentication/authentication.controller'
import verificationCodeController from './features/authentication/verification-codes.controller'

import groupsController from './features/groups/groups.controller'

// Integrations routes
import integrationsController from './features/integrations/integrations.controller'

// Organisation routes
import organisationController from './features/organisations/organisations.controller'

// Simulation routes
import simulationController from './features/simulations/simulations.controller'

// Quiz routes
import quizzAnswersController from './features/quizz-answers/quizz-answers.controller'

// Northstar routes
import northstarRatingsController from './features/northstar-ratings/northstar-ratings.controller'

// Settings route
import getNewsletterSubscriptions from './routes/settings/getNewsletterSubscriptions'
import updateSettingsRoute from './routes/settings/updateSettings'

import { origin } from './config'
import logger from './logger'

const app = express()

app.use(express.json())

app.use(
  cors({
    origin,
    credentials: true,
  })
)

// serve static context files
app.use(express.static('contextes-sondage'))

app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
)

// Legacy routes
app.use('/answers', answersRoute)
app.use('/surveys', surveysRoute)
app.use('/get-stats', statsRoute)
app.use('/simulation', simulationRoute)
app.use('/ratings', ratingsRoute)

// Authentication routes
app.use('/authentication', authenticationController)
app.use('/verification-codes', verificationCodeController)

// Group routes
app.use('/groups', groupsController)

// Integration routes
app.use('/integrations', integrationsController)

// Northstar ratings routes
app.use('/northstar-ratings', northstarRatingsController)

// Organisation routes
app.use('/organisations', organisationController)

// Quizz Answers routes
app.use('/quizz-answers', quizzAnswersController)

// Settings route
app.use('/update-settings', updateSettingsRoute)
app.use('/get-newsletter-subscriptions', getNewsletterSubscriptions)

// Simulations route
app.use('/simulations', simulationController)

export default app
