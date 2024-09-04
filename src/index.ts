import { Server as HttpServer } from 'http'
import type { AddressInfo } from 'net'
import { Server as SocketIOServer } from 'socket.io'
import { prisma } from './adapters/prisma/client'
import app from './app'
import { config, origin } from './config'
import connect from './helpers/db/initDatabase'
import type { LeanAnswerType } from './schemas/_legacy/AnswerSchema'
import Answer from './schemas/_legacy/AnswerSchema'
import type { ModelToDto } from './types/types'

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
      async ({
        room,
        answer,
      }: {
        room: string
        answer: ModelToDto<LeanAnswerType>
      }) => {
        socket.join(room)
        console.log(
          `update ${answer.id} user's data in survey ${room} with total ${answer.data?.total}`
        )

        socket.to(room).emit('received', { answer })

        const id = answer.id!
        const survey = answer.survey!
        const data = answer.data
        const update = {
          survey,
          byCategory: data?.byCategory || {},
          progress: data?.progress || 0,
          total: data?.total || 0,
          ...(!!data?.context && Object.keys(data.context).length !== 0
            ? { context: data.context }
            : {}),
        }

        // Find the document
        await Promise.all([
          Answer.findOneAndUpdate({ id }, answer, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }),
          prisma.answer.upsert({
            where: {
              id_survey: {
                id,
                survey,
              },
            },
            create: {
              id,
              ...update,
            },
            update,
          }),
        ])
      }
    )
  })

  server.listen(config.app.port, () => {
    const { address: host, port } = server.address() as AddressInfo

    console.info({ config })
    console.log('App listening at http://%s:%s', host, port)
  })
})
