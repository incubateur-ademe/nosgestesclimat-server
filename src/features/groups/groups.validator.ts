import z from 'zod'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'

export const GroupParams = z
  .object({
    groupId: z.string(),
  })
  .strict()

export type GroupParams = z.infer<typeof GroupParams>

export const UserParams = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type UserParams = z.infer<typeof UserParams>

export const UserGroupParams = GroupParams.merge(UserParams)

export type UserGroupParams = z.infer<typeof UserGroupParams>

export const UserGroupParticipantParams = UserGroupParams.merge(
  z
    .object({
      participantId: z.string().uuid(),
    })
    .strict()
)

export type UserGroupParticipantParams = z.infer<
  typeof UserGroupParticipantParams
>

const GroupCreateParticipant = z
  .object({
    simulation: z.string().uuid(),
  })
  .strict()

export type GroupCreateParticipant = z.infer<typeof GroupCreateParticipant>

const GroupCreateUser = z
  .object({
    userId: z.string().uuid(),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase())
      .optional(),
    name: z.string(),
  })
  .strict()

export type GroupCreateAdministrator = z.infer<typeof GroupCreateUser>

const GroupCreateDto = z
  .object({
    name: z.string(),
    emoji: z.string(),
    administrator: GroupCreateUser,
    participants: z.tuple([GroupCreateParticipant]).optional(),
  })
  .strict()

export type GroupCreateDto = z.infer<typeof GroupCreateDto>

export const GroupCreateValidator = {
  body: GroupCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}

export const GroupUpdateDto = GroupCreateDto.omit({
  administrator: true,
  participants: true,
})
  .partial()
  .strict()

export type GroupUpdateDto = z.infer<typeof GroupUpdateDto>

export const GroupUpdateValidator = {
  body: GroupUpdateDto,
  params: UserGroupParams,
  query: z.object({}).strict().optional(),
}

export const ParticipantCreateDto = GroupCreateUser.merge(
  GroupCreateParticipant
)

export type ParticipantCreateDto = z.infer<typeof ParticipantCreateDto>

export const ParticipantCreateValidator = {
  body: ParticipantCreateDto,
  params: GroupParams,
  query: z.object({}).strict().optional(),
}

export const ParticipantDeleteValidator = {
  body: z.object({}).strict().optional(),
  params: UserGroupParticipantParams,
  query: z.object({}).strict().optional(),
}

export const GroupsFetchQuery = z.object({
  groupIds: z.array(z.string()).optional(),
})

export type GroupsFetchQuery = z.infer<typeof GroupsFetchQuery>

export const GroupsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: UserParams,
  query: GroupsFetchQuery,
}

export const GroupFetchValidator = {
  body: z.object({}).strict().optional(),
  params: UserGroupParams,
  query: z.object({}).strict().optional(),
}

export const GroupDeleteValidator = {
  body: z.object({}).strict().optional(),
  params: UserGroupParams,
  query: z.object({}).strict().optional(),
}
