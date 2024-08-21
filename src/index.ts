import { Server as HttpServer } from 'http'
import type { AddressInfo } from 'net'
import { Server as SocketIOServer } from 'socket.io'
import app from './app'
import { config, origin } from './config'
import connect from './helpers/db/initDatabase'
import type { AnswerType } from './schemas/_legacy/AnswerSchema'
import Answer from './schemas/_legacy/AnswerSchema'

const server = new HttpServer(app)

const io = new SocketIOServer(server, {
  cors: { origin, methods: ['GET', 'POST'] },
})

connect().then(() => {
  // create an event listener
  //
  // To listen to messages
  io.on('connection', (socket) => {
    console.log('user connected to io')

    socket.on('disconnect', function () {
      console.log('user disconnected from io')
    })
    socket.on(
      'answer',
      async ({ room, answer }: { room: string; answer: AnswerType }) => {
        socket.join(room)
        console.log(
          `update ${answer.id} user's data in survey ${room} with total ${answer.data?.total}`
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

  server.listen(config.app.port, () => {
    const { address: host, port } = server.address() as AddressInfo

    console.info({ config })
    console.log('App listening at http://%s:%s', host, port)
  })
})
