import type { ValueOf } from '../../types/types'

export const PERIODS = {
  year: 'year',
  month: 'month',
  week: 'week',
  day: 'day',
} as const

export type PERIODS = ValueOf<typeof PERIODS>
