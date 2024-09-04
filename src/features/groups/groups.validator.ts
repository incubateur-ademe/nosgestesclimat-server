import z from 'zod'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'

const GroupCreateParticipant = z
  .object({
    simulation: z.string().uuid(),
  })
  .strict()

export type GroupCreateParticipant = z.infer<typeof GroupCreateParticipant>

const GroupCreateAdministrator = z
  .object({
    userId: z.string().uuid(),
    email: z.string().regex(EMAIL_REGEX).optional(),
    name: z.string(),
  })
  .strict()

export type GroupCreateAdministrator = z.infer<typeof GroupCreateAdministrator>

const GroupCreateDto = z
  .object({
    name: z.string(),
    emoji: z.string(),
    administrator: GroupCreateAdministrator,
    participants: z.tuple([GroupCreateParticipant]).optional(),
  })
  .strict()

export const GroupCreateValidator = {
  body: GroupCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}

export type GroupCreateDto = z.infer<typeof GroupCreateDto>
