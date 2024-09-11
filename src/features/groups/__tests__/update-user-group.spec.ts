import { faker } from '@faker-js/faker'
import { version as clientVersion } from '@prisma/client/package.json'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import type { GroupUpdateDto } from '../groups.validator'
import { createGroup, UPDATE_USER_GROUP_ROUTE } from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = UPDATE_USER_GROUP_ROUTE

  describe('When updating one of his groups', () => {
    describe('And invalid userId', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':userId', faker.string.alpha(34))
          )
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And group does not exist', () => {
      test(`Then it should return a ${StatusCodes.NOT_FOUND} error`, async () => {
        // This is not ideal but prismock does not handle this correctly
        jest.spyOn(prisma.group, 'update').mockRejectedValueOnce(
          new PrismaClientKnownRequestError('NotFoundError', {
            code: 'P2025',
            clientVersion,
          })
        )

        // In case of correct error
        await agent
          .put(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.NOT_FOUND)

        jest.spyOn(prisma.group, 'update').mockRestore()

        // This expectation covers the prismock raise
        await agent
          .put(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })
    })

    describe('And group does exist', () => {
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

      test(`Then it should return a ${StatusCodes.OK} response with the updated group`, async () => {
        const payload: GroupUpdateDto = {
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
        }

        const response = await agent
          .put(url.replace(':userId', userId).replace(':groupId', groupId))
          .send(payload)
          .expect(StatusCodes.OK)

        expect(response.body).toEqual({ ...group, ...payload })
      })

      describe('And no data in the update', () => {
        test(`Then it should return a ${StatusCodes.OK} response with the unchanged group`, async () => {
          const response = await agent
            .put(url.replace(':userId', userId).replace(':groupId', groupId))
            .send({})
            .expect(StatusCodes.OK)

          expect(response.body).toEqual(group)
        })
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest.spyOn(prisma.group, 'update').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma.group, 'update').mockRestore()
      })

      test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .put(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':userId', faker.string.uuid())
          )
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it should log the exception`, async () => {
        await agent
          .put(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':userId', faker.string.uuid())
          )
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Group update failed',
          databaseError
        )
      })
    })
  })

  describe('When trying to update a group of another administrator', () => {
    let groupId: string

    beforeEach(async () => ({ id: groupId } = await createGroup({ agent })))

    test(`Then it should return a ${StatusCodes.NOT_FOUND} error`, async () => {
      // This is not ideal but prismock does not handle this correctly
      jest.spyOn(prisma.group, 'update').mockRejectedValueOnce(
        new PrismaClientKnownRequestError('NotFoundError', {
          code: 'P2025',
          clientVersion,
        })
      )

      // In case of correct error
      await agent
        .put(
          url
            .replace(':groupId', groupId)
            .replace(':userId', faker.string.uuid())
        )
        .send({
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
        })
        .expect(StatusCodes.NOT_FOUND)

      jest.spyOn(prisma.group, 'update').mockRestore()

      // This expectation covers the prismock raise
      await agent
        .put(
          url
            .replace(':groupId', groupId)
            .replace(':userId', faker.string.uuid())
        )
        .send({
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
        })
        .expect(StatusCodes.INTERNAL_SERVER_ERROR)
    })
  })
})