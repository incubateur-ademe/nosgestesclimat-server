import { faker } from '@faker-js/faker'
import { version as clientVersion } from '@prisma/client/package.json'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import type { ParticipantCreateDto } from '../groups.validator'
import {
  CREATE_PARTICIPANT_ROUTE,
  createGroup,
} from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_PARTICIPANT_ROUTE

  afterEach(() =>
    Promise.all([prisma.group.deleteMany(), prisma.user.deleteMany()])
  )

  describe("When trying to join another administrator's group", () => {
    describe('And group does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        // This is not ideal but prismock does not handle this correctly
        jest.spyOn(prisma.groupParticipant, 'upsert').mockRejectedValueOnce(
          new PrismaClientKnownRequestError('ForeignKeyConstraintFailedError', {
            code: 'P2003',
            clientVersion,
          })
        )

        await agent
          .post(url.replace(':groupId', faker.database.mongodbObjectId()))
          .send({
            name: faker.person.fullName(),
            userId: faker.string.uuid(),
            simulation: faker.string.uuid(),
          })
          .expect(StatusCodes.NOT_FOUND)

        jest.spyOn(prisma.groupParticipant, 'upsert').mockRestore()

        // Cannot cover other expectation... prismock does not raise
      })
    })

    describe('And group does exist', () => {
      let groupId: string

      beforeEach(async () => ({ id: groupId } = await createGroup({ agent })))

      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              name: faker.person.fullName(),
              email: 'Je ne donne jamais mon email',
              userId: faker.string.uuid(),
              simulation: faker.string.uuid(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user id', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              name: faker.person.fullName(),
              userId: faker.string.alpha(34),
              simulation: faker.string.uuid(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid participant simulation', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              simulation: faker.string.alpha(34),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      test(`Then it returns a ${StatusCodes.CREATED} response with created participant`, async () => {
        const payload: ParticipantCreateDto = {
          name: faker.person.fullName(),
          userId: faker.string.uuid(),
          simulation: faker.string.uuid(),
        }

        const response = await agent
          .post(url.replace(':groupId', groupId))
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(response.body).toEqual({
          id: expect.any(String),
          ...payload,
          createdAt: expect.any(String),
          updatedAt: null,
          email: null,
        })
      })

      test(`Then it stores a participant in database`, async () => {
        const payload: ParticipantCreateDto = {
          userId: faker.string.uuid(),
          name: faker.person.fullName(),
          email: faker.internet.email(),
          simulation: faker.string.uuid(),
        }

        await agent.post(url.replace(':groupId', groupId)).send(payload)

        const createdParticipant = await prisma.groupParticipant.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: payload.userId,
            },
          },
          select: {
            id: true,
            user: true,
            groupId: true,
            createdAt: true,
            updatedAt: true,
            simulationId: true,
          },
        })

        // createdAt are not instance of Date due to jest
        expect(createdParticipant).toEqual({
          id: expect.any(String),
          user: {
            id: payload.userId,
            name: payload.name,
            email: payload.email,
            createdAt: expect.anything(),
            updatedAt: null,
          },
          simulationId: payload.simulation,
          createdAt: expect.anything(),
          updatedAt: null,
          groupId,
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          jest.spyOn(prisma.user, 'upsert').mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          jest.spyOn(prisma.user, 'upsert').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              name: faker.person.fullName(),
              userId: faker.string.uuid(),
              simulation: faker.string.uuid(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent.post(url.replace(':groupId', groupId)).send({
            name: faker.person.fullName(),
            userId: faker.string.uuid(),
            simulation: faker.string.uuid(),
          })

          expect(logger.error).toHaveBeenCalledWith(
            'Participant creation failed',
            databaseError
          )
        })
      })
    })
  })

  describe('When joining his own group', () => {
    let userId: string
    let userName: string
    let userEmail: string
    let groupId: string

    beforeEach(
      async () =>
        ({
          id: groupId,
          administrator: { id: userId, name: userName, email: userEmail },
        } = await createGroup({
          agent,
          group: {},
        }))
    )

    test(`Then it returns a ${StatusCodes.CREATED} response with updated participant`, async () => {
      const payload: ParticipantCreateDto = {
        userId,
        name: userName,
        simulation: faker.string.uuid(),
      }

      const response = await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        ...payload,
        email: userEmail,
        createdAt: expect.any(String),
        updatedAt: null,
      })
    })
  })
})
