import z from 'zod'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'
import { PollDefaultAdditionalQuestionTypeEnum } from '../organisations/organisations.validator'

const ActionChoicesSchema = z.record(z.string(), z.boolean())

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

const ComputedResultSchema = z
  .object({
    carbone: MetricComputedResultSchema,
    eau: MetricComputedResultSchema,
  })
  .strict()

export enum SimulationAdditionalQuestionAnswerType {
  custom = 'custom',
  default = 'default',
}

const AdditionalQuestionsAnswersSchema = z.array(
  z.union([
    z.object({
      type: z.literal(SimulationAdditionalQuestionAnswerType.custom),
      key: z.string(),
      answer: z.string(),
    }),
    z.object({
      type: z.literal(SimulationAdditionalQuestionAnswerType.default),
      key: z.enum([
        PollDefaultAdditionalQuestionTypeEnum.birthdate,
        PollDefaultAdditionalQuestionTypeEnum.postalCode,
      ]),
      answer: z.string(),
    }),
  ])
)

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
    id: z.string().uuid(),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase())
      .optional(),
    name: z.string().optional(),
  })
  .strict()

export const SimulationCreateDto = z.object({
  id: z.string().uuid(),
  date: z.coerce.date().default(() => new Date()),
  progression: z.number(),
  savedViaEmail: z.boolean().default(false),
  computedResults: ComputedResultSchema,
  actionChoices: ActionChoicesSchema.default({}),
  additionalQuestionsAnswers: AdditionalQuestionsAnswersSchema.optional(),
  foldedSteps: FoldedStepsSchema.default([]),
  situation: SituationSchema,
  user: SimulationCreateUser,
})

export type SimulationCreateDto = z.infer<typeof SimulationCreateDto>

export type SimulationCreateInputDto = z.input<typeof SimulationCreateDto>

export const SimulationCreateValidator = {
  body: SimulationCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
