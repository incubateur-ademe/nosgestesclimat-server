import {
  MatomoStatsDevice,
  MatomoStatsKind,
  MatomoStatsSource,
  Prisma,
} from '@prisma/client'
import type { ListIds } from '../../adapters/brevo/constant.js'
import type { Session } from '../../adapters/prisma/transaction.js'
import type { PERIODS } from './stats.constant.js'

export const upsertStat = (
  {
    date,
    kind,
    device,
    iframe,
    source,
    referrer,
    visits,
    finishedSimulations,
    firstAnswer,
  }: {
    date: Date
    source: MatomoStatsSource
    kind: MatomoStatsKind
    referrer?: string
    device: MatomoStatsDevice
    iframe: boolean
    visits: number
    firstAnswer: number
    finishedSimulations: number
  },
  { session }: { session: Session }
) => {
  return session.matomoStats.upsert({
    where: {
      date_source_kind_referrer_device_iframe: {
        date,
        kind,
        iframe,
        device,
        source,
        referrer: referrer || 'all',
      },
    },
    update: {
      visits,
      firstAnswer,
      finishedSimulations,
    },
    create: {
      date,
      kind,
      iframe,
      device,
      source,
      referrer,
      visits,
      firstAnswer,
      finishedSimulations,
    },
  })
}

export const createNewsLetterStats = (
  {
    listId,
    subscriptions,
    date,
  }: { listId: ListIds; subscriptions: number; date: Date },
  { session }: { session: Session }
) => {
  return session.brevoNewsletterStats.create({
    data: {
      date,
      newsletter: listId,
      subscriptions,
    },
  })
}

export type NorthstarStat = {
  date: string
  value: number
}

export const getNorthstarStats = (
  { periodicity }: { periodicity: PERIODS },
  { session }: { session: Session }
) => {
  return session.$queryRaw<NorthstarStat[]>(
    Prisma.sql`
      WITH
      period_data AS (
        SELECT TO_CHAR(DATE_TRUNC(${periodicity}, date), 'YYYY-MM-DD') AS start_period, SUM("finishedSimulations") AS value
        FROM "ngc"."MatomoStats"
        WHERE "source" = cast(${MatomoStatsSource.beta} as ngc."MatomoStatsSource") AND "kind" = cast(${MatomoStatsKind.all} as ngc."MatomoStatsKind") AND "referrer" = 'all' AND "device" = cast(${MatomoStatsDevice.all} as ngc."MatomoStatsDevice") AND "iframe" = false
        GROUP BY start_period
      ),
      period_intervals AS (
        SELECT TO_CHAR(DATE_TRUNC(${periodicity}, interval_start), 'YYYY-MM-DD') as start_period
        FROM generate_series(DATE_TRUNC(${periodicity},(
          SELECT MIN(date)
          FROM "ngc"."MatomoStats"
          WHERE "source" = cast(${MatomoStatsSource.beta} as ngc."MatomoStatsSource") AND "kind" = cast(${MatomoStatsKind.all} as ngc."MatomoStatsKind") AND "referrer" = 'all' AND "device" = cast(${MatomoStatsDevice.all} as ngc."MatomoStatsDevice") AND "iframe" = false
        )), now(), ('1 ' || ${periodicity})::interval) AS interval_start
      )
      SELECT
        period_intervals.start_period as "date",
        (SUM(coalesce(period_data.value, 0)) OVER (ORDER BY period_intervals.start_period))::integer AS "value"
      FROM
        period_data
      RIGHT OUTER JOIN period_intervals on period_intervals.start_period = period_data.start_period
      ORDER BY
        period_intervals.start_period;
    `
  )
}
