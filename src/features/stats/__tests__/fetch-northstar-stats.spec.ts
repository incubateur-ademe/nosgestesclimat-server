import { faker } from '@faker-js/faker'
import { MatomoStatsDevice, MatomoStatsSource, StatsKind } from '@prisma/client'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client.js'
import app from '../../../app.js'
import logger from '../../../logger.js'
import { PERIODS } from '../stats.constant.js'
import type { NorthstarStat } from '../stats.repository.js'
import { upsertStat } from '../stats.repository.js'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/api/stats'

  describe('When fetching northstar stats', () => {
    test(`Then it returns a ${StatusCodes.MOVED_PERMANENTLY} redirection`, async () => {
      const response = await agent
        .get(url)
        .expect(StatusCodes.MOVED_PERMANENTLY)

      expect(response.get('location')).toBe('/stats/v1/northstar')
    })
  })
})

describe('Given a redirected NGC user', () => {
  const agent = supertest(app)
  const url = '/stats/v1/northstar'

  afterEach(() => prisma.matomoStats.deleteMany())

  describe('When fetching northstar stats', () => {
    describe('And invalid period', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url)
          .query({ periodicity: 'hour' })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid since', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url)
          .query({ since: -1 })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And no stats', () => {
      test(`Then it returns a ${StatusCodes.OK} response with empty stats`, async () => {
        const { body } = await agent.get(url).expect(StatusCodes.OK)

        expect(body).toEqual({
          stats: [],
          description: 'Nombre de simulations réalisées',
        })
      })
    })

    describe.each(
      Object.values(PERIODS).map((periodicity) => ({ periodicity }))
    )('And $periodicity stats', ({ periodicity }) => {
      let stats: NorthstarStat[]

      beforeEach(async () => {
        const fivePeriodsAgo = dayjs()
          .locale('fr', {
            weekStart: 1,
          })
          .endOf(periodicity)
          .subtract(4, periodicity)
          .startOf(periodicity)
        const lastFivePeriods = new Array(5)
          .fill(null)
          .map((_, i) => fivePeriodsAgo.add(i, periodicity))

        let accumulator = 0

        stats = []

        for (const period of lastFivePeriods) {
          const finishedSimulations = faker.number.int({
            min: 1000,
            max: 999999,
          })

          const firstAnswer =
            finishedSimulations +
            faker.number.int({
              min: 100,
              max: 9999,
            })

          const visits =
            finishedSimulations *
            faker.number.int({
              min: 3,
              max: 15,
            })

          const stat = await upsertStat(
            {
              date: new Date(`${period.format('YYYY-MM-DD')}T00:00:00.000Z`),
              device: MatomoStatsDevice.all,
              iframe: false,
              source: MatomoStatsSource.beta,
              kind: StatsKind.all,
              finishedSimulations,
              firstAnswer,
              visits,
            },
            { session: prisma }
          )

          accumulator += stat.finishedSimulations

          stats.push({
            date: period.format('YYYY-MM-DD'),
            value: accumulator,
          })
        }
      })

      test(`Then it returns a ${StatusCodes.OK} response with ${periodicity}ly stats`, async () => {
        const { body } = await agent
          .get(url)
          .query({ periodicity })
          .expect(StatusCodes.OK)

        expect(body).toEqual({
          stats,
          description: 'Nombre de simulations réalisées',
        })
      })

      describe(`And since query`, () => {
        test(`Then it returns a ${StatusCodes.OK} response with stats since the given periods`, async () => {
          const since =
            stats.length - faker.number.int({ min: 1, max: stats.length - 1 })

          const { body } = await agent
            .get(url)
            .query({ periodicity, since })
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            stats: stats.slice(stats.length - since),
            description: 'Nombre de simulations réalisées',
          })
        })

        test(`Then it returns a ${StatusCodes.OK} response with all stats if since is greater than the number of stats`, async () => {
          const since =
            stats.length + faker.number.int({ min: 1, max: stats.length })

          const { body } = await agent
            .get(url)
            .query({ periodicity, since })
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            stats,
            description: 'Nombre de simulations réalisées',
          })
        })
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        vi.spyOn(prisma, '$queryRaw').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent.get(url).expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent.get(url)

        expect(logger.error).toHaveBeenCalledWith(
          'Northstar stats fetch failed',
          databaseError
        )
      })
    })
  })
})
