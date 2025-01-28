import express from 'express'
import morgan from 'morgan'

import { createExpressEndpoints } from '@ts-rest/express'
import { generateOpenApi } from '@ts-rest/open-api'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { origin } from './config'
import authenticationController from './features/authentication/authentication.controller'
import verificationCodeController from './features/authentication/verification-codes.controller'
import groupsController from './features/groups/groups.controller'
import integrationsApiContract from './features/integrations/api/api.contract'
import integrationsApiController from './features/integrations/api/api.controller'
import integrationsController from './features/integrations/integrations.controller'
import newslettersController from './features/newsletter/newsletter.controller'
import northstarRatingsController from './features/northstar-ratings/northstar-ratings.controller'
import organisationController from './features/organisations/organisations.controller'
import quizzAnswersController from './features/quizz-answers/quizz-answers.controller'
import simulationController from './features/simulations/simulations.controller'
import usersController from './features/users/users.controller'
import logger from './logger'
import answersRoute from './routes/_legacy/answersRoute'
import ratingsRoute from './routes/_legacy/ratingsRoute'
import simulationRoute from './routes/_legacy/simulationRoute'
import surveysRoute from './routes/_legacy/surveysRoute'
import createGroupRoute from './routes/groups/createGroup'
import deleteGroupRoute from './routes/groups/deleteGroup'
import fetchGroupRoute from './routes/groups/fetchGroup'
import fetchGroupsRoute from './routes/groups/fetchGroups'
import removeParticipantRoute from './routes/groups/removeParticipant'
import updateGroupRoute from './routes/groups/updateGroup'
import createNorthstarRatingRoute from './routes/northstar/create'
import createOrganisationRoute from './routes/organisations/create'
import fetchOrganisationRoute from './routes/organisations/fetchOrganisation'
import getOrgaPollSlugsRoute from './routes/organisations/getOrgaPollSlugs'
import loginOrganisationRoute from './routes/organisations/login'
import logOutRoute from './routes/organisations/logout'
import sendVerificationCodeRoute from './routes/organisations/sendVerificationCode'
import sendVerificationCodeWhenModifyingEmail from './routes/organisations/sendVerificationCodeWhenModifyingEmail'
import updateRoute from './routes/organisations/update'
import updateAdministratorEmail from './routes/organisations/updateAdministratorEmail'
import validateVerificationCodeRoute from './routes/organisations/validateVerificationCode'
import checkCustomQuestionsEnabledRoute from './routes/polls/checkCustomQuestionsEnabled'
import createPollRoute from './routes/polls/create'
import deletePollRoute from './routes/polls/deletePoll'
import fetchPoll from './routes/polls/fetchPoll'
import fetchPollProcessedData from './routes/polls/fetchPollProcessedData'
import fetchPollPublicInfoRoute from './routes/polls/fetchPollPublicInfo'
import fetchPollsRoute from './routes/polls/fetchPolls'
import updateCustomQuestionsRoute from './routes/polls/updateCustomQuestions'
import updatePollRoute from './routes/polls/updatePoll'
import verifyUserParticipationRoute from './routes/polls/verifyUserParticipation'
import createQuizAnswerRoute from './routes/quiz/create'
import getNewsletterSubscriptions from './routes/settings/getNewsletterSubscriptions'
import updateSettingsRoute from './routes/settings/updateSettings'
import createSimulationRoute from './routes/simulations/create'
import fetchSimulationRoute from './routes/simulations/fetchSimulation'
import statsRoute from './routes/stats/statsRoute'
import { initSentry, setupErrorHandler } from './sentry'

const app = express()

if (process.env.SENTRY_DSN) {
  initSentry()
}

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

// Deprecated routes
app.use('/simulations/create', createSimulationRoute)
app.use('/simulations/fetch-simulation', fetchSimulationRoute)
app.use('/group/fetch', fetchGroupRoute)
app.use('/group/create', createGroupRoute)
app.use('/group/update', updateGroupRoute)
app.use('/group/delete', deleteGroupRoute)
app.use('/group/fetch-groups', fetchGroupsRoute)
app.use('/group/remove-participant', removeParticipantRoute)
app.use('/organisations/create', createOrganisationRoute)
app.use('/organisations/login', loginOrganisationRoute)
app.use('/organisations/fetch-organisation', fetchOrganisationRoute)
app.use('/organisations/update', updateRoute)
app.use(
  '/organisations/validate-verification-code',
  validateVerificationCodeRoute
)
app.use('/organisations/send-verification-code', sendVerificationCodeRoute)
app.use('/organisations/logout', logOutRoute)
app.use(
  '/organisations/verify-user-participation',
  verifyUserParticipationRoute
)
app.use('/organisations/get-orga-poll-slugs', getOrgaPollSlugsRoute)
app.use('/organisations/verify-and-update', updateAdministratorEmail)
app.use(
  '/organisations/send-verification-code-when-modifying-email',
  sendVerificationCodeWhenModifyingEmail
)
app.use('/polls/create', createPollRoute)
app.use('/polls/update', updatePollRoute)
app.use('/polls/delete', deletePollRoute)
app.use('/polls/fetch-poll', fetchPoll)
app.use('/polls/fetch-public-poll', fetchPollPublicInfoRoute)
app.use('/polls/fetch-polls', fetchPollsRoute)
app.use('/polls/fetch-poll-processed-data', fetchPollProcessedData)
app.use(
  '/polls/check-custom-questions-enabled',
  checkCustomQuestionsEnabledRoute
)
app.use('/polls/update-custom-questions', updateCustomQuestionsRoute)
app.use('/quiz/answers/create', createQuizAnswerRoute)
app.use('/northstar/ratings/create', createNorthstarRatingRoute)
app.use('/update-settings', updateSettingsRoute)
app.use('/get-newsletter-subscriptions', getNewsletterSubscriptions)

// new API routes
app.use('/authentication', authenticationController)
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

if (process.env.SENTRY_DSN) {
  setupErrorHandler(app)
}

export default app
