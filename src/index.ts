import app from './app'
import { config, origin } from './config'
import connect from './helpers/db/initDatabase'
import Answer from './schemas/_legacy/AnswerSchema'

// require the http module
const http = require('http').Server(app)

// require the socket.io module
const socketio = require('socket.io')

const io = socketio(http, {
  cors: { origin, methods: ['GET', 'POST'] },
})

connect().then(() => {
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
      async ({ room, answer }: { room: string; answer: any }) => {
        socket.join(room)
        console.log(
          `update ${answer.id} user's data in survey ${room} with total ${answer.data.total}`
        )

        socket.to(room).emit('received', { answer })

        const query = { id: answer.id }
        const update = answer
        const options = { upsert: true, new: true, setDefaultsOnInsert: true }

        // Find the document
        await Answer.findOneAndUpdate(query, update, options)
      }
    )
  })

  http.listen(config.app.port, () => {
    const host = http.address().address
    const port = http.address().port

    console.info({ config })
    console.log('App listening at http://%s:%s', host, port)
  })
})
