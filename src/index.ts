import express from 'express'

import answersRoute from './routes/_legacy/answersRoute'
import surveysRoute from './routes/_legacy/surveysRoute'
import statsRoute from './routes/stats/statsRoute'
import simulationRoute from './routes/_legacy/simulationRoute'
import ratingsRoute from './routes/_legacy/ratingsRoute'

// Groups routes
import fetchGroupRoute from './routes/groups/fetchGroup'
import createGroupRoute from './routes/groups/createGroup'
import updateGroupRoute from './routes/groups/updateGroup'
import deleteGroupRoute from './routes/groups/deleteGroup'

// Group participants routes
import fetchGroupsRoute from './routes/groups/fetchGroups'
import removeParticipantRoute from './routes/groups/removeParticipant'

// Organisation routes
import createOrganisationRoute from './routes/organisations/create'
import fetchOrganisationRoute from './routes/organisations/fetchOrganisation'
import loginOrganisationRoute from './routes/organisations/login'
import sendVerificationCodeRoute from './routes/organisations/sendVerificationCode'
import updateRoute from './routes/organisations/update'
import validateVerificationCodeRoute from './routes/organisations/validateVerificationCode'
import logOutRoute from './routes/organisations/logout'
import getOrgaPollSlugsRoute from './routes/organisations/getOrgaPollSlugs'
import addContactToConnectRoute from './routes/organisations/addContactToConnect'

// Polls routes
import fetchPollPublicInfoRoute from './routes/polls/fetchPollPublicInfo'
import fetchPollsRoute from './routes/polls/fetchPolls'
import fetchPollProcessedData from './routes/polls/fetchPollProcessedData'
import verifyUserParticipationRoute from './routes/polls/verifyUserParticipation'
import updateCustomQuestionsRoute from './routes/polls/updateCustomQuestions'
import checkCustomQuestionsEnabledRoute from './routes/polls/checkCustomQuestionsEnabled'
import createPollRoute from './routes/polls/create'
import updatePollRoute from './routes/polls/updatePoll'
import deletePollRoute from './routes/polls/deletePoll'
import fetchPoll from './routes/polls/fetchPoll'

// Simulation routes
import createSimulationRoute from './routes/simulations/create'
import fetchSimulationRoute from './routes/simulations/fetchSimulation'

// Quiz routes
import createQuizAnswerRoute from './routes/quiz/create'

// Northstar routes
import createNorthstarRatingRoute from './routes/northstar/create'

// Email route
import sendEmailRoute from './routes/email/sendEmail'

// Settings route
import updateSettingsRoute from './routes/settings/updateSettings'
import getNewsletterSubscriptions from './routes/settings/getNewsletterSubscriptions'

import cors from 'cors'
import Answer from './schemas/_legacy/AnswerSchema'
import connect from './helpers/db/initDatabase'
import { config } from './config'

if (config.env === 'development') {
  require('dotenv').config()
}

const app = express()

app.use(express.json())

const origin =
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

app.use(
  cors({
    origin,
    credentials: true,
  })
)

// serve static context files
app.use(express.static('contextes-sondage'))

// Legacy routes
app.use('/answers', answersRoute)
app.use('/surveys', surveysRoute)
app.use('/get-stats', statsRoute)
app.use('/simulation', simulationRoute)
app.use('/ratings', ratingsRoute)

// Simulations route
app.use('/simulations/create', createSimulationRoute)
app.use('/simulations/fetch-simulation', fetchSimulationRoute)

// Group routes
app.use('/group/fetch', fetchGroupRoute)
app.use('/group/create', createGroupRoute)
app.use('/group/update', updateGroupRoute)
app.use('/group/delete', deleteGroupRoute)

// Group participants routes
app.use('/group/fetch-groups', fetchGroupsRoute)
app.use('/group/remove-participant', removeParticipantRoute)

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
app.use('/organisations/add-contact-to-connect', addContactToConnectRoute)

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

// Quiz routes
app.use('/quiz/answers/create', createQuizAnswerRoute)

// Northstar routes
app.use('/northstar/ratings/create', createNorthstarRatingRoute)

// Email route
app.use('/send-email', sendEmailRoute)

// Settings route
app.use('/update-settings', updateSettingsRoute)
app.use('/get-newsletter-subscriptions', getNewsletterSubscriptions)

// require the http module
const http = require('http').Server(app)

// require the socket.io module
const socketio = require('socket.io')

const io = socketio(http, {
  cors: { origin, methods: ['GET', 'POST'] },
})

// create an event listener
//
// To listen to messages
io.on('connection', (socket: any) => {
  console.log('user connected to io')

  socket.on('disconnect', function () {
    console.log('user disconnected from io')
  })
  socket.on(
    'answer',
    function ({ room, answer }: { room: string; answer: any }) {
      socket.join(room)
      console.log(
        `update ${answer.id} user's data in survey ${room} with total ${answer.data.total}`
      )

      socket.to(room).emit('received', { answer })

      connect.then(async () => {
        const query = { id: answer.id }
        const update = answer
        const options = { upsert: true, new: true, setDefaultsOnInsert: true }

        // Find the document
        await Answer.findOneAndUpdate(query, update, options)
      })
    }
  )
})

http.listen(config.app.port, () => {
  const host = http.address().address
  const port = http.address().port

  console.info({ config })
  console.log('App listening at http://%s:%s', host, port)
})
