import {
  PollDefaultAdditionalQuestionType,
  SimulationAdditionalQuestionAnswerType,
} from '@prisma/client'
import z from 'zod'
import { ListIds } from '../../adapters/brevo/constant'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'
import { PublicPollParams } from '../organisations/organisations.validator'
import { UserParams } from '../users/users.validator'

const SimulationParams = z
  .object({
    simulationId: z.string().uuid(),
  })
  .strict()

export type SimulationParams = z.infer<typeof SimulationParams>

export const UserSimulationParams = SimulationParams.merge(UserParams)

export type UserSimulationParams = z.infer<typeof UserSimulationParams>

const ActionChoicesSchema = z.record(z.string(), z.boolean())

export type ActionChoicesSchema = z.infer<typeof ActionChoicesSchema>

const CategoriesSchema = z
  .object({
    alimentation: z.number(),
    transport: z.number(),
    logement: z.number(),
    divers: z.number(),
    'services sociétaux': z.number(),
  })
  .strict()

const MetricComputedResultSchema = z
  .object({
    bilan: z.number(),
    categories: CategoriesSchema,
    subcategories: z.record(z.string(), z.number()),
  })
  .strict()

export const ComputedResultSchema = z
  .object({
    carbone: MetricComputedResultSchema,
    eau: MetricComputedResultSchema,
  })
  .strict()

export type ComputedResultSchema = z.infer<typeof ComputedResultSchema>

const AdditionalQuestionsAnswersSchema = z.array(
  z.union([
    z.object({
      type: z.literal(SimulationAdditionalQuestionAnswerType.custom),
      key: z.string(),
      answer: z.string(),
    }),
    z.object({
      type: z.literal(SimulationAdditionalQuestionAnswerType.default),
      key: z.nativeEnum(PollDefaultAdditionalQuestionType),
      answer: z.string(),
    }),
  ])
)

export type AdditionalQuestionsAnswersSchema = z.infer<
  typeof AdditionalQuestionsAnswersSchema
>

const FoldedStepsSchema = z.array(z.string())

export const SituationSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z
      .object({
        valeur: z.union([
          z.coerce.number(),
          z
            .string()
            .transform((s) => +s.replace(/\s/g, ''))
            .pipe(z.coerce.number()),
        ]),
        unité: z.string().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal('number'),
        fullPrecision: z.boolean(),
        nodeValue: z.number(),
        nodeKind: z.literal('constant'),
        rawNode: z.number(),
        isNullable: z.boolean().optional(),
        missingVariables: z.object({}).optional(),
      })
      .strict(),
    z
      .object({
        explanation: z
          .object({
            type: z.literal('number'),
            fullPrecision: z.boolean(),
            nodeValue: z.number(),
            nodeKind: z.literal('constant'),
            rawNode: z
              .object({
                constant: z
                  .object({
                    type: z.union([z.literal('constant'), z.literal('number')]),
                    nodeValue: z.number(),
                  })
                  .strict(),
              })
              .strict(),
            isNullable: z.boolean().optional(),
            missingVariables: z.object({}).optional(),
          })
          .strict(),
        unit: z
          .object({
            numerators: z.string(),
            denominators: z.string().optional(),
          })
          .strict(),
        nodeKind: z.literal('unité'),
        rawNode: z.string(),
      })
      .strict(),
  ])
)

export type SituationSchemaInput = z.input<typeof SituationSchema>

export type SituationSchema = z.infer<typeof SituationSchema>

const SimulationCreateUser = z
  .object({
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase())
      .optional(),
    name: z.string().optional(),
  })
  .strict()

export type SimulationCreateUser = z.infer<typeof SimulationCreateUser>

export const SimulationParticipantCreateDto = z.object({
  id: z.string().uuid(),
  date: z.coerce.date().default(() => new Date()),
  progression: z.number(),
  savedViaEmail: z.boolean().default(false),
  computedResults: ComputedResultSchema,
  actionChoices: ActionChoicesSchema.default({}),
  additionalQuestionsAnswers: AdditionalQuestionsAnswersSchema.optional(),
  foldedSteps: FoldedStepsSchema.default([]),
  situation: SituationSchema,
})

export type SimulationParticipantCreateDto = z.infer<
  typeof SimulationParticipantCreateDto
>

export type SimulationParticipantCreateInputDto = z.input<
  typeof SimulationParticipantCreateDto
>

export const SimulationCreateDto = SimulationParticipantCreateDto.merge(
  z
    .object({
      user: SimulationCreateUser.optional(),
    })
    .strict()
)

export type SimulationCreateDto = z.infer<typeof SimulationCreateDto>

export type SimulationCreateInputDto = z.input<typeof SimulationCreateDto>

export const SimulationCreateNewsletterList = z
  .array(
    z.coerce
      .number()
      .pipe(
        z.union([
          z.literal(ListIds.MAIN_NEWSLETTER),
          z.literal(ListIds.LOGEMENT_NEWSLETTER),
          z.literal(ListIds.TRANSPORT_NEWSLETTER),
        ])
      )
  )
  .optional()

export type SimulationCreateNewsletterList = z.infer<
  typeof SimulationCreateNewsletterList
>

export const SimulationCreateValidator = {
  body: SimulationCreateDto,
  params: UserParams,
  query: z
    .object({
      newsletters: SimulationCreateNewsletterList,
      sendEmail: z.coerce.boolean().optional(),
    })
    .strict()
    .optional(),
}

export const SimulationsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: UserParams,
  query: z.object({}).strict().optional(),
}

export const SimulationFetchValidator = {
  body: z.object({}).strict().optional(),
  params: UserSimulationParams,
  query: z.object({}).strict().optional(),
}

export const OrganisationPollSimulationCreateValidator = {
  body: SimulationCreateDto,
  params: PublicPollParams,
  query: z.object({}).strict().optional(),
}
