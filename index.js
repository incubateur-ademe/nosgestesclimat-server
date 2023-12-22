const express = require('express')
const answersRoute = require('./routes/answersRoute')
const surveysRoute = require('./routes/surveysRoute')
const statsRoute = require('./routes/statsRoute')
const simulationRoute = require('./routes/simulationRoute')
const ratingsRoute = require('./routes/ratingsRoute')
const emailSimulationRoutes = require('./routes/emailSimulationRoutes')
const groupRoute = require('./routes/groupsRoute')
const organizationsRoutes = require('./routes/organizationRoute')
const cors = require('cors')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const app = express()

app.use(express.json())

const origin =
  process.env.NODE_ENV === 'development'
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
  })
)

// serve static context files
app.use(express.static('contextes-sondage'))

// routes
app.use('/answers', answersRoute)
app.use('/surveys', surveysRoute)
app.use('/get-stats', statsRoute)
app.use('/simulation', simulationRoute)
app.use('/ratings', ratingsRoute)
app.use('/email-simulation', emailSimulationRoutes)
app.use('/group', groupRoute)
app.use('/organizations', organizationsRoutes)

// require the http module
const http = require('http').Server(app)

// require the socket.io module
const socketio = require('socket.io')

const port = process.env.PORT || 3000

const io = socketio(http, {
  cors: { origin, methods: ['GET', 'POST'] },
})

const Answer = require('./schemas/AnswerSchema')
const connect = require('./scripts/initDatabase')

// create an event listener
//
// To listen to messages
io.on('connection', (socket) => {
  console.log('user connected to io')

  socket.on('disconnect', function () {
    console.log('user disconnected from io')
  })
  socket.on('answer', function ({ room, answer }) {
    socket.join(room)
    console.log(
      `update ${answer.id} user's data in survey ${room} with total ${answer.data.total}`
    )

    socket.to(room).emit('received', { answer })

    connect.then(() => {
      const query = { id: answer.id }
      const update = answer
      const options = { upsert: true, new: true, setDefaultsOnInsert: true }

      // Find the document
      Answer.findOneAndUpdate(query, update, options, function (error, result) {
        if (error) {
          console.log('Error updating database with user answer')
        }
      })
    })
  })
})

// wire up the server to listen to our port 500
http.listen(port, () => {
  const host = http.address().address
  const port = http.address().port

  console.log('App listening at http://%s:%s', host, port)
})
