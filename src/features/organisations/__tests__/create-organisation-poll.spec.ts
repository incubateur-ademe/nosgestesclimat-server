import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'

import slugify from 'slugify'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import { COOKIE_NAME } from '../../authentication/authentication.service'
import type { PollDefaultAdditionalQuestionTypeEnum } from '../organisations.validator'
import { type OrganisationPollCreateDto } from '../organisations.validator'
import {
  CREATE_ORGANISATION_POLL_ROUTE,
  createOrganisation,
  createOrganisationPoll,
  mockUpdateOrganisationPollCreation,
} from './fixtures/organisations.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_ORGANISATION_POLL_ROUTE

  afterEach(() =>
    Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  )

  describe('And logged out', () => {
    describe('When creating a poll in his organisation', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .post(
            url.replace(
              ':organisationIdOrSlug',
              faker.database.mongodbObjectId()
            )
          )
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And invalid cookie', () => {
    describe('When creating a poll in his organisation', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .post(
            url.replace(
              ':organisationIdOrSlug',
              faker.database.mongodbObjectId()
            )
          )
          .set('cookie', `${COOKIE_NAME}=invalid cookie`)
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And logged in', () => {
    let cookie: string

    beforeEach(async () => {
      ;({ cookie } = await login({ agent }))
    })

    describe('When creating a poll in his organisation', () => {
      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid name', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: '',
            })
            .expect(StatusCodes.BAD_REQUEST)

          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.string.alpha(151),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid defaultAdditionalQuestions', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
              defaultAdditionalQuestions: [
                'my-invalid-pollDefaultAdditionalQuestionType',
              ],
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid customAdditionalQuestions', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
              defaultAdditionalQuestions: ['birthdate'],
              customAdditionalQuestions: [{}],
            })
            .expect(StatusCodes.BAD_REQUEST)

          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
              defaultAdditionalQuestions: ['postalCode'],
              customAdditionalQuestions: [
                {
                  question: 'Question 1',
                  isEnabled: true,
                },
                {
                  question: 'Question 2',
                  isEnabled: true,
                },
                {
                  question: 'Question 3',
                  isEnabled: true,
                },
                {
                  question: 'Question 4',
                  isEnabled: true,
                },
                {
                  question: 'Question 5',
                  isEnabled: true,
                },
              ],
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And organisation does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
            })
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And organisation does exist', () => {
        let organisationId: string
        let organisationSlug: string

        beforeEach(
          async () =>
            ({ id: organisationId, slug: organisationSlug } =
              await createOrganisation({
                agent,
                cookie,
              }))
        )

        beforeEach(() => {
          // This is not ideal but prismock does not handle this correctly
          jest
            .spyOn(prisma.organisation, 'update')
            .mockImplementationOnce(mockUpdateOrganisationPollCreation)
        })

        afterEach(() => {
          jest.spyOn(prisma.organisation, 'update').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.CREATED} response with the created poll`, async () => {
          const payload = {
            name: faker.company.buzzNoun(),
          }

          const response = await agent
            .post(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(response.body).toEqual({
            ...payload,
            id: expect.any(String),
            slug: slugify(payload.name.toLowerCase(), { strict: true }),
            defaultAdditionalQuestions: [],
            customAdditionalQuestions: [],
            expectedNumberOfParticipants: null,
            createdAt: expect.any(String),
            updatedAt: null,
          })
        })

        test('Then it stores a poll in database', async () => {
          const payload: OrganisationPollCreateDto = {
            name: faker.company.buzzNoun(),
            defaultAdditionalQuestions: [
              'postalCode' as PollDefaultAdditionalQuestionTypeEnum,
            ],
            customAdditionalQuestions: [
              {
                question: 'Est-ce que tu buildes ?',
                isEnabled: true,
              },
            ],
            expectedNumberOfParticipants: faker.number.int(),
          }

          const {
            body: { id },
          } = await agent
            .post(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.CREATED)

          const createdPoll = await prisma.poll.findUnique({
            where: {
              id,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              customAdditionalQuestions: true,
              defaultAdditionalQuestions: {
                select: {
                  type: true,
                },
              },
              organisationId: true,
              expectedNumberOfParticipants: true,
              createdAt: true,
              updatedAt: true,
            },
          })
          // createdAt are not instance of Date due to jest
          expect(createdPoll).toEqual({
            ...payload,
            id,
            slug: slugify(payload.name.toLowerCase(), { strict: true }),
            organisationId,
            createdAt: expect.anything(),
            updatedAt: null,
            defaultAdditionalQuestions: payload.defaultAdditionalQuestions?.map(
              (type) => ({ type })
            ),
          })
        })

        describe('And using the organisation slug', () => {
          test(`Then it returns a ${StatusCodes.CREATED} response with the created poll`, async () => {
            const payload = {
              name: faker.company.buzzNoun(),
            }

            const response = await agent
              .post(url.replace(':organisationIdOrSlug', organisationSlug))
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.CREATED)

            expect(response.body).toEqual({
              ...payload,
              id: expect.any(String),
              slug: slugify(payload.name.toLowerCase(), { strict: true }),
              defaultAdditionalQuestions: [],
              customAdditionalQuestions: [],
              expectedNumberOfParticipants: null,
              createdAt: expect.any(String),
              updatedAt: null,
            })
          })
        })
      })

      describe('And a poll with the same name already exists in the organisation', () => {
        let organisationId: string
        let name: string

        beforeEach(async () => {
          ;({ id: organisationId } = await createOrganisation({
            agent,
            cookie,
          }))
          name = faker.company.buzzNoun()
          await createOrganisationPoll({
            agent,
            cookie,
            organisationId,
            poll: { name },
          })
        })

        test(`Then it returns a ${StatusCodes.CREATED} response with the created poll and an incremented slug`, async () => {
          // This is not ideal but prismock does not handle this correctly
          jest
            .spyOn(prisma.organisation, 'update')
            .mockImplementationOnce(mockUpdateOrganisationPollCreation)

          const payload = {
            name,
          }

          const response = await agent
            .post(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(response.body).toEqual({
            ...payload,
            id: expect.any(String),
            slug: `${slugify(payload.name.toLowerCase(), { strict: true })}-1`,
            defaultAdditionalQuestions: [],
            customAdditionalQuestions: [],
            expectedNumberOfParticipants: null,
            createdAt: expect.any(String),
            updatedAt: null,
          })

          jest.spyOn(prisma.organisation, 'update').mockRestore()
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          jest
            .spyOn(prisma.organisation, 'findFirstOrThrow')
            .mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          jest.spyOn(prisma.organisation, 'findFirstOrThrow').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent
            .post(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
            })

          expect(logger.error).toHaveBeenCalledWith(
            'Poll creation failed',
            databaseError
          )
        })
      })
    })
  })
})
