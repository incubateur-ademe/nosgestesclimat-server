import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import * as prismaTransactionAdapter from '../../../adapters/prisma/transaction'
import app from '../../../app'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import {
  createOrganisation,
  createOrganisationPoll,
  createOrganisationPollSimulation,
  FETCH_ORGANISATION_PUBLIC_POLL_DASHBOARD_ROUTE,
} from './fixtures/organisations.fixture'

vi.mock('../../../adapters/prisma/transaction', async () => ({
  ...(await vi.importActual('../../../adapters/prisma/transaction')),
}))

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_ORGANISATION_PUBLIC_POLL_DASHBOARD_ROUTE

  afterEach(async () => {
    await Promise.all([
      prisma.organisationAdministrator.deleteMany(),
      prisma.simulationPoll.deleteMany(),
    ])
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And logged out', () => {
    describe('When fetching a public organisation poll dashboard', () => {
      describe('And invalid userId', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .get(
              url
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
                .replace(':userId', faker.string.alpha(34))
            )
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And poll does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .get(
              url
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
                .replace(':userId', faker.string.uuid())
            )
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And poll does exist', () => {
        let pollId: string
        let pollSlug: string

        beforeEach(async () => {
          const { cookie } = await login({ agent })
          const { id: organisationId } = await createOrganisation({
            agent,
            cookie,
          })
          ;({ id: pollId, slug: pollSlug } = await createOrganisationPoll({
            agent,
            cookie,
            organisationId,
          }))
        })

        describe('And he did not participate to the poll', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
            const response = await agent
              .get(
                url
                  .replace(':pollIdOrSlug', pollId)
                  .replace(':userId', faker.string.uuid())
              )
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({
              funFacts: {
                percentageOfBicycleUsers: null,
                percentageOfVegetarians: null,
                percentageOfCarOwners: null,
                percentageOfPlaneUsers: null,
                percentageOfLongPlaneUsers: null,
                averageOfCarKilometers: null,
                averageOfTravelers: null,
                percentageOfElectricHeating: null,
                percentageOfGasHeating: null,
                percentageOfFuelHeating: null,
                percentageOfWoodHeating: null,
                percentageOfCoolingSystem: null,
                percentageOfVegan: null,
                percentageOfRedMeat: null,
                percentageOfLocalAndSeasonal: null,
                percentageOfBottledWater: null,
                percentageOfZeroWaste: null,
                amountOfClothing: 0,
                percentageOfStreaming: null,
              },
            })
          })
        })

        describe('And he did participate to the poll', () => {
          let userId: string

          beforeEach(async () => {
            ;({
              user: { id: userId },
            } = await createOrganisationPollSimulation({
              agent,
              pollId,
            }))
          })

          test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
            const response = await agent
              .get(
                url.replace(':pollIdOrSlug', pollId).replace(':userId', userId)
              )
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({
              funFacts: expect.any(Object),
            })
          })

          describe('And using poll slug', () => {
            test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
              const response = await agent
                .get(
                  url
                    .replace(':pollIdOrSlug', pollSlug)
                    .replace(':userId', userId)
                )
                .expect(StatusCodes.OK)

              expect(response.body).toEqual({
                funFacts: expect.any(Object),
              })
            })
          })

          describe('And another participant joins', () => {
            beforeEach(async () =>
              createOrganisationPollSimulation({
                agent,
                pollId,
              })
            )

            test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
              const response = await agent
                .get(
                  url
                    .replace(':pollIdOrSlug', pollId)
                    .replace(':userId', userId)
                )
                .expect(StatusCodes.OK)

              expect(response.body).toEqual({
                funFacts: expect.any(Object),
              })
            })
          })
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
            .get(
              url
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
                .replace(':userId', faker.string.uuid())
            )
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent
            .get(
              url
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
                .replace(':userId', faker.string.uuid())
            )
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Public poll dashboard fetch failed',
            databaseError
          )
        })
      })
    })
  })

  describe('And logged in on his organisation space', () => {
    let cookie: string
    let userId: string

    beforeEach(async () => {
      ;({ cookie, userId } = await login({ agent }))
    })

    describe('And poll does exist', () => {
      let pollId: string

      beforeEach(async () => {
        const { id: organisationId } = await createOrganisation({
          agent,
          cookie,
        })
        ;({ id: pollId } = await createOrganisationPoll({
          agent,
          cookie,
          organisationId,
        }))
      })

      test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
        const response = await agent
          .get(url.replace(':pollIdOrSlug', pollId).replace(':userId', userId))
          .set('cookie', cookie)
          .expect(StatusCodes.OK)

        expect(response.body).toEqual({
          funFacts: {
            percentageOfBicycleUsers: null,
            percentageOfVegetarians: null,
            percentageOfCarOwners: null,
            percentageOfPlaneUsers: null,
            percentageOfLongPlaneUsers: null,
            averageOfCarKilometers: null,
            averageOfTravelers: null,
            percentageOfElectricHeating: null,
            percentageOfGasHeating: null,
            percentageOfFuelHeating: null,
            percentageOfWoodHeating: null,
            percentageOfCoolingSystem: null,
            percentageOfVegan: null,
            percentageOfRedMeat: null,
            percentageOfLocalAndSeasonal: null,
            percentageOfBottledWater: null,
            percentageOfZeroWaste: null,
            amountOfClothing: 0,
            percentageOfStreaming: null,
          },
        })
      })

      describe('And participants do their simulation', () => {
        beforeEach(async () => {
          let i = 0
          while (i < 3) {
            await createOrganisationPollSimulation({
              agent,
              pollId,
            })
            i++
          }
        })

        test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
          const response = await agent
            .get(
              url.replace(':pollIdOrSlug', pollId).replace(':userId', userId)
            )
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            funFacts: expect.any(Object),
          })
        })
      })
    })
  })

  describe('And logged in on his organisation space with a different userId', () => {
    let cookie: string
    let email: string
    let userId: string

    describe('And poll does exist', () => {
      let organisation: Awaited<ReturnType<typeof createOrganisation>>
      let poll: Awaited<ReturnType<typeof createOrganisationPoll>>
      let pollId: string

      beforeEach(async () => {
        ;({ cookie, userId, email } = await login({ agent }))

        organisation = await createOrganisation({
          agent,
          cookie,
        })
        const { id: organisationId } = organisation
        poll = await createOrganisationPoll({
          agent,
          cookie,
          organisationId,
        })
        ;({ id: pollId } = poll)
      })

      describe('And participants do their simulation', () => {
        beforeEach(async () => {
          ;({ cookie, userId } = await login({
            agent,
            verificationCode: { email },
          }))

          let i = 0
          while (i < 3) {
            await createOrganisationPollSimulation({
              agent,
              pollId,
            })
            i++
          }
        })

        test(`Then it returns a ${StatusCodes.OK} response with the dashboard`, async () => {
          const response = await agent
            .get(
              url.replace(':pollIdOrSlug', pollId).replace(':userId', userId)
            )
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            funFacts: expect.any(Object),
          })
        })
      })
    })
  })
})
