import z from 'zod'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'

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

export enum OrganisationTypeEnum {
  association = 'association',
  company = 'company',
  cooperative = 'cooperative',
  groupOfFriends = 'groupOfFriends',
  other = 'other',
  publicOrRegionalAuthority = 'publicOrRegionalAuthority',
  universityOrSchool = 'universityOrSchool',
}

const OrganisationType = z.enum([
  OrganisationTypeEnum.association,
  OrganisationTypeEnum.company,
  OrganisationTypeEnum.cooperative,
  OrganisationTypeEnum.groupOfFriends,
  OrganisationTypeEnum.other,
  OrganisationTypeEnum.publicOrRegionalAuthority,
  OrganisationTypeEnum.universityOrSchool,
])

const OrganisationCreateAdministrator = z
  .object({
    name: z.string().optional(),
    telephone: z.string().optional(),
    position: z.string().optional(),
    optedInForCommunications: z.boolean().optional(),
  })
  .strict()

export type OrganisationCreateAdministrator = z.infer<
  typeof OrganisationCreateAdministrator
>

const OrganisationCreateDto = z
  .object({
    name: z.string().min(1).max(100),
    type: OrganisationType,
    administrators: z.tuple([OrganisationCreateAdministrator]).optional(),
    numberOfCollaborators: z.number().optional(),
  })
  .strict()

export type OrganisationCreateDto = z.infer<typeof OrganisationCreateDto>

export const OrganisationCreateValidator = {
  body: OrganisationCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}

const OrganisationUpdateAdministrator = OrganisationCreateAdministrator.merge(
  z
    .object({
      email: z
        .string()
        .regex(EMAIL_REGEX)
        .transform((email) => email.toLocaleLowerCase()),
    })
    .strict()
)

export type OrganisationUpdateAdministrator = z.infer<
  typeof OrganisationUpdateAdministrator
>

const OrganisationUpdateDto = OrganisationCreateDto.merge(
  z
    .object({
      administrators: z.tuple([OrganisationUpdateAdministrator]).optional(),
    })
    .strict()
)
  .partial()
  .strict()

export type OrganisationUpdateDto = z.infer<typeof OrganisationUpdateDto>

const OrganisationUpdateQuery = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict()

export type OrganisationUpdateQuery = z.infer<typeof OrganisationUpdateQuery>

export const OrganisationUpdateValidator = {
  body: OrganisationUpdateDto,
  params: OrganisationParams,
  query: OrganisationUpdateQuery,
}

export const OrganisationsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}

export const OrganisationFetchValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationParams,
  query: z.object({}).strict().optional(),
}

export enum PollDefaultAdditionalQuestionTypeEnum {
  birthdate = 'birthdate',
  postalCode = 'postalCode',
}

const OrganisationPollCreateCustomAdditionalQuestion = z
  .object({
    question: z.string(),
    isEnabled: z.boolean(),
  })
  .strict()

const MAX_CUSTOM_ADDITIONAL_QUESTIONS = 4

const OrganisationPollCreateDto = z
  .object({
    name: z.string().min(1).max(150),
    expectedNumberOfParticipants: z.number().optional(),
    defaultAdditionalQuestions: z
      .array(
        z.enum([
          PollDefaultAdditionalQuestionTypeEnum.birthdate,
          PollDefaultAdditionalQuestionTypeEnum.postalCode,
        ])
      )
      .optional(),
    customAdditionalQuestions: z
      .array(OrganisationPollCreateCustomAdditionalQuestion)
      .max(MAX_CUSTOM_ADDITIONAL_QUESTIONS)
      .optional(),
  })
  .strict()

export type OrganisationPollCreateDto = z.infer<
  typeof OrganisationPollCreateDto
>

export const OrganisationPollCreateValidator = {
  body: OrganisationPollCreateDto,
  params: OrganisationParams,
  query: z.object({}).strict().optional(),
}

const OrganisationPollUpdateDto = OrganisationPollCreateDto.partial()

export type OrganisationPollUpdateDto = z.infer<
  typeof OrganisationPollUpdateDto
>

export const OrganisationPollUpdateValidator = {
  body: OrganisationPollUpdateDto,
  params: OrganisationPollParams,
  query: z.object({}).strict().optional(),
}

export const OrganisationPollDeleteValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationPollParams,
  query: z.object({}).strict().optional(),
}

export const OrganisationPollsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationParams,
  query: z.object({}).strict().optional(),
}

export const OrganisationPollFetchValidator = {
  body: z.object({}).strict().optional(),
  params: OrganisationPollParams,
  query: z.object({}).strict().optional(),
}
