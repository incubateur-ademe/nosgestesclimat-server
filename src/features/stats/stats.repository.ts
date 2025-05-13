import type {
  MatomoStatsDevice,
  MatomoStatsKind,
  MatomoStatsSource,
} from '@prisma/client'
import type { Session } from '../../adapters/prisma/transaction'

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
