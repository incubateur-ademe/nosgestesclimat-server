import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
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

  afterEach(() =>
    Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  )

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

    beforeEach(async () => {
      ;({ cookie } = await login({ agent }))
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
        let organisationSlug: string
        let pollId: string
        let pollSlug: string
        let poll: Awaited<ReturnType<typeof createOrganisationPoll>>

        beforeEach(async () => {
          ;({ id: organisationId, slug: organisationSlug } =
            await createOrganisation({
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
          await agent
            .delete(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .set('cookie', cookie)
            .expect(StatusCodes.NO_CONTENT)
        })

        describe('And using organisation and poll slugs', () => {
          test(`Then it returns a ${StatusCodes.NO_CONTENT} response`, async () => {
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
