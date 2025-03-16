import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import { COOKIE_NAME } from '../../authentication/authentication.service'
import {
  createOrganisation,
  createOrganisationPoll,
  DELETE_ORGANISATION_POLL_ROUTE,
} from './fixtures/organisations.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = DELETE_ORGANISATION_POLL_ROUTE

  afterEach(async () => {
    await prisma.organisationAdministrator.deleteMany()
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And logged out', () => {
    describe('When deleting one of his organisation poll', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .delete(
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
    describe('When deleting one of his organisation poll', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .delete(
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

    describe('When deleting one of his organisation poll', () => {
      describe('And poll does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .delete(
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

        test(`Then it returns a ${StatusCodes.NO_CONTENT} response`, async () => {
          nock(process.env.BREVO_URL!)
            .post('/v3/contacts')
            .reply(200)
            .post('/v3/contacts/lists/27/contacts/remove')
            .reply(200)

          await agent
            .delete(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .expect(StatusCodes.NO_CONTENT)
        })

        test('Then it updates organisation administrator in brevo', async () => {
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
            .delete(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .expect(StatusCodes.NO_CONTENT)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })

        describe('And using organisation and poll slugs', () => {
          test(`Then it returns a ${StatusCodes.NO_CONTENT} response`, async () => {
            nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove')
              .reply(200)

            await agent
              .delete(
                url
                  .replace(':organisationIdOrSlug', organisationSlug)
                  .replace(':pollIdOrSlug', pollSlug)
              )
              .set('cookie', cookie)
              .expect(StatusCodes.NO_CONTENT)
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
            .delete(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .expect(StatusCodes.NO_CONTENT)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          vi.spyOn(prisma, '$transaction').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .delete(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent
            .delete(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .set('cookie', cookie)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Poll delete failed',
            databaseError
          )
        })
      })
    })
  })
})
