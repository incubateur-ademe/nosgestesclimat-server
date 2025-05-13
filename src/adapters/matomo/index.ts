import { MatomoStatsSource } from '@prisma/client'
import type { ValueOf } from '../../types/types'
import { matomoClientFactory } from './client'
import { matomo as matomoBeta } from './stats-beta/client'
import { matomo as matomoData } from './stats-data/client'

export const clients = {
  [MatomoStatsSource.beta]: matomoClientFactory(matomoBeta),
  [MatomoStatsSource.data]: matomoClientFactory(matomoData),
} as const

export type clients = ValueOf<typeof clients>
