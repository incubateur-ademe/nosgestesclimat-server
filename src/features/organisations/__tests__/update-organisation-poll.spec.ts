import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import { COOKIE_NAME } from '../../authentication/authentication.service'
import type {
  OrganisationPollUpdateDto,
  PollDefaultAdditionalQuestionTypeEnum,
} from '../organisations.validator'
import {
  createOrganisation,
  createOrganisationPoll,
  UPDATE_ORGANISATION_POLL_ROUTE,
} from './fixtures/organisations.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = UPDATE_ORGANISATION_POLL_ROUTE

  afterEach(async () => {
    await prisma.organisationAdministrator.deleteMany()
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And logged out', () => {
    describe('When updating one of his organisation poll', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .put(
            url
              .replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
              .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
          )
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And invalid cookie', () => {
    describe('When updating one of his organisation poll', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .put(
            url
              .replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
              .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
          )
          .set('cookie', `${COOKIE_NAME}=invalid cookie`)
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And logged in', () => {
    let cookie: string
    let email: string
    let userId: string

    beforeEach(async () => {
      ;({ cookie, email, userId } = await login({ agent }))
    })

    describe('When updating one of his organisation poll', () => {
      describe('And invalid name', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .send({
              name: '',
            })
            .expect(StatusCodes.BAD_REQUEST)

          await agent
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
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
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .send({
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
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .send({
              customAdditionalQuestions: [{}],
            })
            .expect(StatusCodes.BAD_REQUEST)

          await agent
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .send({
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

      describe('And poll does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And poll does exist', () => {
        let organisationId: string
        let organisationName: string
        let organisationSlug: string
        let pollId: string
        let pollSlug: string
        let poll: Awaited<ReturnType<typeof createOrganisationPoll>>

        beforeEach(async () => {
          ;({
            id: organisationId,
            name: organisationName,
            slug: organisationSlug,
          } = await createOrganisation({
            agent,
            cookie,
          }))
          poll = await createOrganisationPoll({
            agent,
            cookie,
            organisationId,
          })
          ;({ id: pollId, slug: pollSlug } = poll)
        })

        test(`Then it returns a ${StatusCodes.OK} response with the updated poll`, async () => {
          const payload: OrganisationPollUpdateDto = {
            name: faker.company.buzzNoun(),
          }

          nock(process.env.BREVO_URL!)
            .post('/v3/contacts')
            .reply(200)
            .post('/v3/contacts/lists/27/contacts/remove')
            .reply(200)

          const response = await agent
            .put(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            ...poll,
            ...payload,
            updatedAt: expect.any(String),
          })
        })

        describe('And no data in the update', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the unchanged poll`, async () => {
            nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove')
              .reply(200)

            const response = await agent
              .put(
                url
                  .replace(':organisationIdOrSlug', organisationId)
                  .replace(':pollIdOrSlug', pollId)
              )
              .set('cookie', cookie)
              .send({})
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({
              ...poll,
              updatedAt: expect.any(String),
            })
          })
        })

        test('Then it updates organisation administrator in brevo', async () => {
          const payload: OrganisationPollUpdateDto = {
            name: faker.company.buzzNoun(),
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/contacts', {
              email,
              attributes: {
                USER_ID: userId,
                IS_ORGANISATION_ADMIN: true,
                ORGANISATION_NAME: organisationName,
                ORGANISATION_SLUG: organisationSlug,
                LAST_POLL_PARTICIPANTS_NUMBER: 0,
                OPT_IN: false,
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/contacts/lists/27/contacts/remove')
            .reply(200)

          await agent
            .put(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(scope.isDone()).toBeTruthy()
        })

        describe('And using organisation and poll slugs', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the updated poll`, async () => {
            const payload: OrganisationPollUpdateDto = {
              name: faker.company.buzzNoun(),
            }

            nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove')
              .reply(200)

            const response = await agent
              .put(
                url
                  .replace(':organisationIdOrSlug', organisationSlug)
                  .replace(':pollIdOrSlug', pollSlug)
              )
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({ ...poll, ...payload })
          })
        })

        describe('And updating defaultAdditionalQuestions', () => {
          // prismock does not handle this correcly
          test.skip(`Then it returns a ${StatusCodes.OK} response with the updated group`, async () => {
            const payload: OrganisationPollUpdateDto = {
              defaultAdditionalQuestions: [
                'postalCode' as PollDefaultAdditionalQuestionTypeEnum,
              ],
            }

            nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove')
              .reply(200)

            let response = await agent
              .put(
                url
                  .replace(':organisationIdOrSlug', organisationId)
                  .replace(':pollIdOrSlug', pollId)
              )
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({
              ...poll,
              ...payload,
              updatedAt: expect.any(String),
            })

            payload.defaultAdditionalQuestions = [
              'birthdate' as PollDefaultAdditionalQuestionTypeEnum,
            ]

            nock(process.env.BREVO_URL!).post('/v3/contacts').reply(200)

            response = await agent
              .put(
                url
                  .replace(':organisationIdOrSlug', organisationId)
                  .replace(':pollIdOrSlug', pollId)
              )
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({
              ...poll,
              ...payload,
              updatedAt: expect.any(String),
            })
          })
        })
      })

      describe('And poll does exist And administrator opt in for communications', () => {
        let organisationId: string
        let organisationName: string
        let organisationSlug: string
        let pollId: string
        let poll: Awaited<ReturnType<typeof createOrganisationPoll>>

        beforeEach(async () => {
          ;({
            id: organisationId,
            name: organisationName,
            slug: organisationSlug,
          } = await createOrganisation({
            agent,
            cookie,
            organisation: {
              administrators: [
                {
                  optedInForCommunications: true,
                },
              ],
            },
          }))
          poll = await createOrganisationPoll({
            agent,
            cookie,
            organisationId,
          })
          ;({ id: pollId } = poll)
        })

        test('Then it updates organisation administrator in brevo', async () => {
          const payload: OrganisationPollUpdateDto = {
            name: faker.company.buzzNoun(),
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/contacts', {
              email,
              listIds: [27],
              attributes: {
                USER_ID: userId,
                IS_ORGANISATION_ADMIN: true,
                ORGANISATION_NAME: organisationName,
                ORGANISATION_SLUG: organisationSlug,
                LAST_POLL_PARTICIPANTS_NUMBER: 0,
                OPT_IN: true,
              },
              updateEnabled: true,
            })
            .reply(200)

          await agent
            .put(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          jest
            .spyOn(prisma.poll, 'findFirstOrThrow')
            .mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          jest.spyOn(prisma.poll, 'findFirstOrThrow').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent
            .put(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.buzzNoun(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Poll update failed',
            databaseError
          )
        })
      })
    })
  })
})
