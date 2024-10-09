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

// Groups routes
import groupsController from './features/groups/groups.controller'
import createGroupRoute from './routes/groups/createGroup'
import deleteGroupRoute from './routes/groups/deleteGroup'
import fetchGroupRoute from './routes/groups/fetchGroup'
import updateGroupRoute from './routes/groups/updateGroup'

// Group participants routes
import fetchGroupsRoute from './routes/groups/fetchGroups'
import removeParticipantRoute from './routes/groups/removeParticipant'

// Integrations routes
import integrationsController from './features/integrations/integrations.controller'

// Organisation routes
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

// Polls routes
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

// Simulation routes
import createSimulationRoute from './routes/simulations/create'
import fetchSimulationRoute from './routes/simulations/fetchSimulation'

// Quiz routes
import quizzAnswersController from './features/quizz-answers/quizz-answers.controller'
import createQuizAnswerRoute from './routes/quiz/create'

// Northstar routes
import northstarRatingsController from './features/northstar-ratings/northstar-ratings.controller'
import createNorthstarRatingRoute from './routes/northstar/create'

// Email route
import sendEmailRoute from './routes/email/sendEmail'

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

// Simulations route
app.use('/simulations/create', createSimulationRoute)
app.use('/simulations/fetch-simulation', fetchSimulationRoute)

// Group routes
app.use('/group/fetch', fetchGroupRoute)
app.use('/group/create', createGroupRoute)
app.use('/group/update', updateGroupRoute)
app.use('/group/delete', deleteGroupRoute)
app.use('/groups', groupsController)

// Group participants routes
app.use('/group/fetch-groups', fetchGroupsRoute)
app.use('/group/remove-participant', removeParticipantRoute)

//Integrations routes
app.use('/integrations', integrationsController)

// Organisation routes
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

// Polls routes
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

// quizz-answers routes
app.use('/quizz-answers', quizzAnswersController)
app.use('/quiz/answers/create', createQuizAnswerRoute)

// northstar-ratings routes
app.use('/northstar-ratings', northstarRatingsController)
app.use('/northstar/ratings/create', createNorthstarRatingRoute)

// Email route
app.use('/send-email', sendEmailRoute)

// Settings route
app.use('/update-settings', updateSettingsRoute)
app.use('/get-newsletter-subscriptions', getNewsletterSubscriptions)

export default app
