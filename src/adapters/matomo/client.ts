import { MatomoStatsDevice, MatomoStatsKind } from '@prisma/client'
import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import logger from '../../logger'

export const ReferrerType = {
  [MatomoStatsKind.direct]: 1,
  [MatomoStatsKind.search]: 2,
  [MatomoStatsKind.website]: 3,
  [MatomoStatsKind.campaign]: 6,
  [MatomoStatsKind.social]: 7,
} as const

export const ReferrerKind = {
  1: MatomoStatsKind.direct,
  2: MatomoStatsKind.search,
  3: MatomoStatsKind.website,
  6: MatomoStatsKind.campaign,
  7: MatomoStatsKind.social,
} as const

export const MatomoActions = {
  firstAnswer: ['1ère réponse au bilan', 'Simulation First answer'],
  finishedSimulations: ['A terminé la simulation', 'Simulation Completed'],
} as const

export const MatomoActionsSet: Record<
  keyof typeof MatomoActions,
  Set<string>
> = {
  firstAnswer: new Set(MatomoActions.firstAnswer),
  finishedSimulations: new Set(MatomoActions.finishedSimulations),
}

export const MatomoIframeVisits = [
  'visites via iframe',
  'Iframe visit',
] as const

export const MatomoIframeVisitsSet = new Set<string>(MatomoIframeVisits)

const ReferrerBaseSchema = z
  .object({
    label: z.string(),
    nb_visits: z.number(),
    segment: z.string(),
    nb_uniq_visitors: z.number().optional(),
    nb_actions: z.number().optional(),
    nb_users: z.number().optional(),
    max_actions: z.number().optional(),
    sum_visit_length: z.number().optional(),
    bounce_count: z.number().optional(),
    goals: z.record(z.string(), z.unknown()).optional(),
    nb_visits_converted: z.number().optional(),
    nb_conversions: z.number().optional(),
    revenue: z.number().optional(),
    idsubdatatable: z.number().optional(),
  })
  .strict()

const ReferrerTypeSchema = ReferrerBaseSchema.extend({
  referrer_type: z.nativeEnum(ReferrerType),
}).strict()

export type ReferrerTypeSchema = z.infer<typeof ReferrerTypeSchema>

const ReferrerWebsiteSchema = ReferrerBaseSchema

export type ReferrerWebsiteSchema = z.infer<typeof ReferrerWebsiteSchema>

const ReferrerCampaignSchema = ReferrerBaseSchema

export type ReferrerCampaignSchema = z.infer<typeof ReferrerCampaignSchema>

const DayVisitSchema = z
  .object({
    value: z.number(),
  })
  .strict()

export type DayVisitSchema = z.infer<typeof DayVisitSchema>

const DayActionSchema = z.object({
  label: z.string(),
  nb_uniq_visitors: z.number(),
  nb_visits: z.union([z.string(), z.number()]),
  nb_events: z.union([z.string(), z.number()]),
  nb_events_with_value: z.union([z.string(), z.number()]),
  sum_event_value: z.number(),
  min_event_value: z.union([z.number(), z.boolean()]).nullable(),
  max_event_value: z.number().nullable(),
  avg_event_value: z.number(),
  segment: z.string(),
  idsubdatatable: z.number().optional(),
})

export type DayActionSchema = z.infer<typeof DayActionSchema>

const getFullSegments = ({
  iframe,
  device,
  segment = '',
}: {
  device?: MatomoStatsDevice | null
  segment?: string
  iframe?: boolean
} = {}) => {
  if (device && device !== MatomoStatsDevice.all) {
    segment += segment ? ';' : ''
    segment += `deviceType==${device}`
  }

  if (iframe) {
    segment += segment ? ';' : ''

    return MatomoIframeVisits.map(
      (visitKind) => `${segment}eventAction==${encodeURIComponent(visitKind)}`
    )
  }

  return [segment]
}

export const matomoClientFactory = (client: AxiosInstance) => {
  return {
    async getReferrers(date: string) {
      const { data } = await client('/', {
        params: {
          method: 'Referrers.getReferrerType',
          period: 'day',
          date,
        },
      })

      return z.array(ReferrerTypeSchema).parse(data)
    },

    async getReferrersWebsites(date: string) {
      const { data } = await client('/', {
        params: {
          method: 'Referrers.getWebsites',
          period: 'day',
          date,
        },
      })

      return z.array(ReferrerWebsiteSchema).parse(data)
    },

    async getReferrersCampaigns(date: string) {
      const { data } = await client('/', {
        params: {
          method: 'Referrers.getCampaigns',
          period: 'day',
          date,
        },
      })

      return z.array(ReferrerWebsiteSchema).parse(data)
    },

    async getDayVisits(
      date: string,
      params?: {
        device?: MatomoStatsDevice | null
        segment?: string
        iframe?: boolean
      }
    ) {
      let segments = getFullSegments(params)

      const dayVisits = { value: 0 }

      for (const segment of segments) {
        const { data } = await client('/', {
          params: {
            method: 'VisitsSummary.getVisits',
            date,
            period: 'day',
            ...(segment ? { segment } : {}),
          },
        })

        const { success, data: safeData } = DayVisitSchema.safeParse(data)

        if (success) {
          dayVisits.value += safeData.value
        } else {
          logger.warn('getDayVisits(): Got invalid DayVisit data', {
            date,
            params,
            data,
          })
        }
      }

      if (params?.iframe && dayVisits.value === 0) {
        segments = getFullSegments({
          ...params,
          iframe: false,
        })

        for (const segment of segments) {
          const { data } = await client('/', {
            params: {
              method: 'Events.getAction',
              date,
              period: 'day',
              'label[]': MatomoIframeVisits.map((visitKind) =>
                encodeURIComponent(visitKind)
              ),
              ...(segment
                ? {
                    segment,
                  }
                : {}),
            },
          })

          const { success, data: safeData } = z
            .array(DayActionSchema)
            .safeParse(data)

          if (success) {
            safeData.forEach(({ label, nb_visits }) => {
              if (MatomoIframeVisitsSet.has(label)) {
                dayVisits.value += +nb_visits || 0
              }
            })
          } else {
            logger.warn('getDayVisits(): Got invalid DayAction data', {
              date,
              params,
              data,
            })
          }
        }
      }

      return dayVisits
    },

    async getDayActions(
      date: string,
      params?: {
        device?: MatomoStatsDevice | null
        segment?: string
        iframe?: boolean
      }
    ) {
      const segments = getFullSegments(params)

      let firstAnswer = 0
      let finishedSimulations = 0

      for (const segment of segments) {
        const { data } = await client('/', {
          params: {
            method: 'Events.getAction',
            'label[]': [
              ...MatomoActions.firstAnswer.map((action) =>
                encodeURIComponent(action)
              ),
              ...MatomoActions.finishedSimulations.map((action) =>
                encodeURIComponent(action)
              ),
            ],
            period: 'day',
            date,
            ...(segment ? { segment } : {}),
          },
        })

        const { success, data: safeData } = z
          .array(DayActionSchema)
          .safeParse(data)

        if (success) {
          safeData.forEach(({ label, nb_visits }) => {
            if (MatomoActionsSet.firstAnswer.has(label)) {
              firstAnswer += +nb_visits || 0
            }

            if (MatomoActionsSet.finishedSimulations.has(label)) {
              finishedSimulations += +nb_visits || 0
            }
          })
        } else {
          logger.warn('getDayActions(): Got invalid DayAction data', {
            date,
            params,
            data,
          })
        }
      }

      return { firstAnswer, finishedSimulations }
    },
  }
}
