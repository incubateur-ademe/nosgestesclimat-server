import { MatomoStatsSource } from '@prisma/client'
import type { ValueOf } from '../../types/types.js'
import { matomoClientFactory } from './client.js'
import { matomo as matomoBeta } from './stats-beta/client.js'
import { matomo as matomoData } from './stats-data/client.js'

export const clients = {
  [MatomoStatsSource.beta]: matomoClientFactory(matomoBeta),
  [MatomoStatsSource.data]: matomoClientFactory(matomoData),
} as const

export type clients = ValueOf<typeof clients>
