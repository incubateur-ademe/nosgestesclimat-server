import {
  OrganisationType,
  PollDefaultAdditionalQuestionType,
} from '@prisma/client'
import { z } from 'zod'
import { LocaleQuery } from '../../core/i18n/lang.validator.js'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail.js'
import { UserParams } from '../users/users.validator.js'

const OrganisationParams = z
  .object({
    organisationIdOrSlug: z.string(),
  })
  .strict()

export type OrganisationParams = z.infer<typeof OrganisationParams>

const PollParams = z
  .object({
    pollIdOrSlug: z.string(),
  })
  .strict()

export type PollParams = z.infer<typeof PollParams>

export const OrganisationPollParams = OrganisationParams.merge(PollParams)

export type OrganisationPollParams = z.infer<typeof OrganisationPollParams>

export const PublicPollParams = UserParams.merge(PollParams)

export type PublicPollParams = z.infer<typeof PublicPollParams>

const OrganisationCreateAdministrator = z
  .object({
    name: z.string().optional().nullable(),
    telephone: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    optedInForCommunications: z.boolean().optional(),
  })
  .strict()

export type OrganisationCreateAdministrator = z.infer<
  typeof OrganisationCreateAdministrator
>

const OrganisationCreateDto = z
  .object({
    name: z.string().min(1).max(100),
    type: z.nativeEnum(OrganisationType).optional(),
    administrators: z.tuple([OrganisationCreateAdministrator]).optional(),
    numberOfCollaborators: z.number().optional().nullable(),
  })
  .strict()

export type OrganisationCreateDto = z.infer<typeof OrganisationCreateDto>

export const OrganisationCreateValidator = {
  body: OrganisationCreateDto,
  params: z.object({}).strict().optional(),
  query: LocaleQuery.optional(),
}

const OrganisationUpdateAdministrator = OrganisationCreateAdministrator.merge(
  z
    .object({
      email: z
        .string()
        .regex(EMAIL_REGEX)
        .transform((email) => email.toLocaleLowerCase())
        .optional(),
    })
    .strict()
)

export type OrganisationUpdateAdministrator = z.infer<
  typeof OrganisationUpdateAdministrator
>

export const OrganisationUpdateDto = OrganisationCreateDto.merge(
  z
    .object({
      administrators: z.tuple([OrganisationUpdateAdministrator]).optional(),
    })
    .strict()
)
  .partial()
  .strict()

export type OrganisationUpdateDto = z.infer<typeof OrganisationUpdateDto>

export const OrganisationUpdateQuery = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .merge(LocaleQuery)
  .strict()

export type OrganisationUpdateQuery = z.infer<typeof OrganisationUpdateQuery>

export const OrganisationUpdateValidator = {
  body: OrganisationUpdateDto,
  params: OrganisationParams,
  query: OrganisationUpdateQuery.optional(),
}

export const OrganisationsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
  query: LocaleQuery.optional(),
}

export const OrganisationFetchValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationParams,
  query: LocaleQuery.optional(),
}

const OrganisationPollCustomAdditionalQuestion = z
  .object({
    question: z.string(),
    isEnabled: z.boolean(),
  })
  .strict()

export type OrganisationPollCustomAdditionalQuestion = z.infer<
  typeof OrganisationPollCustomAdditionalQuestion
>

export const OrganisationPollCustomAdditionalQuestions = z.array(
  OrganisationPollCustomAdditionalQuestion
)

const MAX_CUSTOM_ADDITIONAL_QUESTIONS = 4

const OrganisationPollCreateDto = z
  .object({
    name: z.string().min(1).max(150),
    expectedNumberOfParticipants: z.number().optional().nullable(),
    defaultAdditionalQuestions: z
      .array(z.nativeEnum(PollDefaultAdditionalQuestionType))
      .optional()
      .nullable(),
    customAdditionalQuestions: z
      .array(OrganisationPollCustomAdditionalQuestion)
      .max(MAX_CUSTOM_ADDITIONAL_QUESTIONS)
      .optional()
      .nullable(),
  })
  .strict()

export type OrganisationPollCreateDto = z.infer<
  typeof OrganisationPollCreateDto
>

export const OrganisationPollCreateValidator = {
  body: OrganisationPollCreateDto,
  params: OrganisationParams,
  query: LocaleQuery.optional(),
}

const OrganisationPollUpdateDto = OrganisationPollCreateDto.partial()

export type OrganisationPollUpdateDto = z.infer<
  typeof OrganisationPollUpdateDto
>

export const OrganisationPollSimulationsDownloadQuery = z
  .object({
    jobId: z.string().optional(),
  })
  .merge(LocaleQuery)
  .strict()

export const OrganisationPollUpdateValidator = {
  body: OrganisationPollUpdateDto,
  params: OrganisationPollParams,
  query: LocaleQuery.optional(),
}

export const OrganisationPollDeleteValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationPollParams,
  query: LocaleQuery.optional(),
}

export const OrganisationPollsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationParams,
  query: LocaleQuery.optional(),
}

export const OrganisationPollFetchValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationPollParams,
  query: LocaleQuery.optional(),
}

export const OrganisationPollSimulationsDownloadValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationPollParams,
  query: OrganisationPollSimulationsDownloadQuery.optional(),
}

export const OrganisationPublicPollFetchValidator = {
  body: z.object({}).strict().optional(),
  params: PublicPollParams,
  query: LocaleQuery.optional(),
}

export const OrganisationPublicPollSimulationsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: PublicPollParams,
  query: LocaleQuery.optional(),
}

export const OrganisationPublicPollDashboardValidator = {
  body: z.object({}).strict().optional(),
  params: PublicPollParams,
  query: LocaleQuery.optional(),
}
