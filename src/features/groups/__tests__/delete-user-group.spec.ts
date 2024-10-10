import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { createGroup, DELETE_USER_GROUP_ROUTE } from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = DELETE_USER_GROUP_ROUTE

  describe('When deleting his group', () => {
    describe('And invalid userId', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .delete(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':userId', faker.string.alpha(34))
          )
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And no data', () => {
      test(`Then it should return a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .delete(
            url
              .replace(':userId', faker.string.uuid())
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And a group exists', () => {
      let groupId: string
      let userId: string

      beforeEach(
        async () =>
          ({
            id: groupId,
            administrator: { id: userId },
          } = await createGroup({ agent }))
      )

      test(`Then it should return a ${StatusCodes.NO_CONTENT} response`, async () => {
        await agent
          .delete(url.replace(':groupId', groupId).replace(':userId', userId))
          .expect(StatusCodes.NO_CONTENT)
      })
    })

    describe('And not group administrator', () => {
      let groupId: string
      let userId: string

      beforeEach(async () => {
        userId = faker.string.uuid()
        ;({ id: groupId } = await createGroup({
          agent,
        }))
      })

      test(`Then it should return a ${StatusCodes.NOT_FOUND} response`, async () => {
        await agent
          .delete(url.replace(':userId', userId!).replace(':groupId', groupId!))
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest.spyOn(prisma.group, 'delete').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma.group, 'delete').mockRestore()
      })

      test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .delete(
            url
              .replace(':userId', faker.string.uuid())
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it should log the exception`, async () => {
        await agent
          .delete(
            url
              .replace(':userId', faker.string.uuid())
              .replace(':groupId', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Group delete failed',
          databaseError
        )
      })
    })
  })
})
