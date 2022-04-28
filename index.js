const express = require('express')
const answersRoute = require('./answersRoute')
const surveysRoute = require('./surveysRoute')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()

app.use(express.json())

const origin =
  process.env.NODE_ENV === 'developement'
    ? 'http://localhost:8080'
    : [
        'https://nosgestesclimat.fr',
        'https://sondage-mongo--nosgestesclimat.netlify.app',
      ]

app.use(
  cors({
    origin,
  })
)

// serve static context files

app.use(express.static('contextes-sondage'))

//routes
app.use('/answers', answersRoute)
app.use('/surveys', surveysRoute)

//require the http module
const http = require('http').Server(app)

// require the socket.io module
const socketio = require('socket.io')

const port = process.env.PORT || 3000

const io = socketio(http, {
  cors: { origin, methods: ['GET', 'POST'] },
})

const Answer = require('./AnswerSchema')
const Survey = require('./SurveySchema')
const connect = require('./database')

//create an event listener
//
//To listen to messages
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

    connect.then((db) => {
      const query = { id: answer.id },
        update = answer,
        options = { upsert: true, new: true, setDefaultsOnInsert: true }

      // Find the document
      Answer.findOneAndUpdate(query, update, options, function (error, result) {
        if (error) {
          console.log('Error updating database with user answer')
        }
      })
    })
  })
})

//wire up the server to listen to our port 500
http.listen(port, () => {
  var host = http.address().address
  var port = http.address().port
  console.log('App listening at http://%s:%s', host, port)
})
