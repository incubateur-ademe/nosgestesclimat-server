import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import * as prismaTransactionAdapter from '../../../adapters/prisma/transaction'
import app from '../../../app'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import { COOKIE_NAME } from '../../authentication/authentication.service'
import {
  createOrganisation,
  FETCH_ORGANISATIONS_ROUTE,
} from './fixtures/organisations.fixture'

vi.mock('../../../adapters/prisma/transaction', async () => ({
  ...(await vi.importActual('../../../adapters/prisma/transaction')),
}))

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_ORGANISATIONS_ROUTE

  afterEach(async () => {
    await prisma.organisationAdministrator.deleteMany()
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And logged out', () => {
    describe('When fetching his organisations', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent.get(url).expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And invalid cookie', () => {
    describe('When fetching his organisations', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .get(url)
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

    describe('When fetching his organisations', () => {
      describe('And no organisation for the user', () => {
        test(`Then it returns a ${StatusCodes.OK} response with an empty list`, async () => {
          const response = await agent
            .get(url)
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual([])
        })
      })

      describe('And an organisation does exist for the user', () => {
        let organisation: Awaited<ReturnType<typeof createOrganisation>>

        beforeEach(
          async () =>
            (organisation = await createOrganisation({ agent, cookie }))
        )

        test(`Then it returns a ${StatusCodes.OK} response with a list containing the organisation`, async () => {
          const response = await agent
            .get(url)
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual([organisation])
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          vi.spyOn(
            prismaTransactionAdapter,
            'transaction'
          ).mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          vi.spyOn(prismaTransactionAdapter, 'transaction').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .get(url)
            .set('cookie', cookie)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent.get(url).set('cookie', cookie)

          expect(logger.error).toHaveBeenCalledWith(
            'Organisations fetch failed',
            databaseError
          )
        })
      })
    })
  })
})
