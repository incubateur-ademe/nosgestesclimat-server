import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import {
  createGroup,
  DELETE_PARTICIPANT_ROUTE,
  joinGroup,
} from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = DELETE_PARTICIPANT_ROUTE

  describe("When trying to leave another administrator's group", () => {
    describe('And group does not exist', () => {
      test(`Then it should return a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .delete(
            url
              .replace(':groupId', faker.database.mongodbObjectId())
              .replace(':participantId', faker.string.uuid())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And group does exist', () => {
      let groupId: string

      beforeEach(async () => ({ id: groupId } = await createGroup({ agent })))

      describe('And invalid user id', () => {
        test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .delete(
              url
                .replace(':groupId', groupId)
                .replace(':participantId', faker.string.uuid())
                .replace(':userId', faker.string.alpha(34))
            )
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid participant id', () => {
        test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .delete(
              url
                .replace(':groupId', groupId)
                .replace(':participantId', faker.string.alpha(34))
                .replace(':userId', faker.string.uuid())
            )
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And he did not join', () => {
        test(`Then it should return a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .delete(
              url
                .replace(':groupId', groupId)
                .replace(':participantId', faker.string.uuid())
                .replace(':userId', faker.string.uuid())
            )
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And he did join', () => {
        let participantId: string
        let userId: string

        beforeEach(
          async () =>
            ({ id: participantId, userId } = await joinGroup({
              agent,
              groupId,
            }))
        )

        test(`Then it should return a ${StatusCodes.NO_CONTENT} response`, async () => {
          await agent
            .delete(
              url
                .replace(':groupId', groupId)
                .replace(':participantId', participantId)
                .replace(':userId', userId)
            )
            .expect(StatusCodes.NO_CONTENT)
        })

        describe('And database failure', () => {
          const databaseError = new Error('Something went wrong')

          beforeEach(() => {
            jest
              .spyOn(prisma.group, 'findUniqueOrThrow')
              .mockRejectedValueOnce(databaseError)
          })

          afterEach(() => {
            jest.spyOn(prisma.group, 'findUniqueOrThrow').mockRestore()
          })

          test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
            await agent
              .delete(
                url
                  .replace(':groupId', faker.database.mongodbObjectId())
                  .replace(':participantId', faker.string.uuid())
                  .replace(':userId', faker.string.uuid())
              )
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)
          })

          test(`Then it should log the exception`, async () => {
            await agent
              .delete(
                url
                  .replace(':groupId', faker.database.mongodbObjectId())
                  .replace(':participantId', faker.string.uuid())
                  .replace(':userId', faker.string.uuid())
              )
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            expect(logger.error).toHaveBeenCalledWith(
              'Participant deletion failed',
              databaseError
            )
          })
        })
      })
    })
  })

  describe("When trying to remove another participant from another administrator's group", () => {
    let userId: string
    let groupId: string
    let participantId: string

    beforeEach(async () => {
      ;({
        id: groupId,
        participants: [{ id: participantId }],
      } = await createGroup({
        agent,
        group: {
          participants: [
            {
              simulation: faker.string.uuid(),
            },
          ],
        },
      }))
      ;({ userId } = await joinGroup({ agent, groupId }))
    })

    test(`Then it should return a ${StatusCodes.FORBIDDEN} error`, async () => {
      const response = await agent
        .delete(
          url
            .replace(':groupId', groupId)
            .replace(':participantId', participantId)
            .replace(':userId', userId)
        )
        .expect(StatusCodes.FORBIDDEN)

      expect(response.text).toEqual(
        'Forbidden ! You cannot remove other participants from this group.'
      )
    })
  })

  describe('When trying to leave his own group', () => {
    let userId: string
    let groupId: string
    let participantId: string

    beforeEach(
      async () =>
        ({
          id: groupId,
          participants: [{ id: participantId, userId }],
        } = await createGroup({
          agent,
          group: {
            participants: [
              {
                simulation: faker.string.uuid(),
              },
            ],
          },
        }))
    )

    test(`Then it should return a ${StatusCodes.FORBIDDEN} error`, async () => {
      const response = await agent
        .delete(
          url
            .replace(':groupId', groupId)
            .replace(':participantId', participantId)
            .replace(':userId', userId)
        )
        .expect(StatusCodes.FORBIDDEN)

      expect(response.text).toEqual(
        'Forbidden ! Administrator cannot leave group, delete it instead.'
      )
    })
  })

  describe('When trying to remove participants from his own group', () => {
    let userId: string
    let groupId: string
    let participantId: string

    beforeEach(async () => {
      ;({
        id: groupId,
        administrator: { id: userId },
      } = await createGroup({
        agent,
        group: {
          participants: [
            {
              simulation: faker.string.uuid(),
            },
          ],
        },
      }))
      ;({ id: participantId } = await joinGroup({ agent, groupId }))
    })

    test(`Then it should return a ${StatusCodes.NO_CONTENT} response`, async () => {
      await agent
        .delete(
          url
            .replace(':groupId', groupId)
            .replace(':participantId', participantId)
            .replace(':userId', userId)
        )
        .expect(StatusCodes.NO_CONTENT)
    })
  })
})
