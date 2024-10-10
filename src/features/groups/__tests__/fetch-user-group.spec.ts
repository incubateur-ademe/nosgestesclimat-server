import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import {
  createGroup,
  FETCH_USER_GROUP_ROUTE,
  joinGroup,
} from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_USER_GROUP_ROUTE

  describe('When fetching one of his groups', () => {
    describe('And invalid userId', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(
            url
              .replace(':userId', faker.string.alpha(34))
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And no data', () => {
      test(`Then it should return a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .get(
            url
              .replace(':userId', faker.string.uuid())
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And a group exists', () => {
      let group: Awaited<ReturnType<typeof createGroup>>
      let groupId: string
      let userId: string

      beforeEach(async () => {
        group = await createGroup({ agent })
        ;({
          id: groupId,
          administrator: { id: userId },
        } = group)
      })

      test(`Then it should return a ${StatusCodes.OK} response with the group`, async () => {
        const response = await agent
          .get(url.replace(':userId', userId).replace(':groupId', groupId))
          .expect(StatusCodes.OK)

        expect(response.body).toEqual(group)
      })

      describe('And he joined it', () => {
        let user: Awaited<ReturnType<typeof joinGroup>>

        beforeEach(async () => {
          user = await joinGroup({ agent, groupId })
          userId = user.userId
        })

        test(`Then it should return a ${StatusCodes.OK} response with the group`, async () => {
          const response = await agent
            .get(url.replace(':userId', userId).replace(':groupId', groupId))
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            id: group.id,
            name: group.name,
            emoji: group.emoji,
            administrator: {
              name: group.administrator.name,
            },
            participants: [user],
            createdAt: expect.any(String),
            updatedAt: null,
          })
        })
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest
          .spyOn(prisma.group, 'findUniqueOrThrow')
          .mockRejectedValueOnce(databaseError)
      })

      test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .get(
            url
              .replace(':userId', faker.string.uuid())
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it should log the exception`, async () => {
        await agent
          .get(
            url
              .replace(':userId', faker.string.uuid())
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Group fetch failed',
          databaseError
        )
      })
    })
  })
})
