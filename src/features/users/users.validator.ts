import z from 'zod'
import { ListIds } from '../../adapters/brevo/constant'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'

export const UserParams = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type UserParams = z.infer<typeof UserParams>

export const FetchUserContactValidator = {
  body: z.object({}).strict().optional(),
  params: UserParams,
  query: z.object({}).strict().optional(),
}

const UserUpdateDto = z
  .object({
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
    name: z.string(),
    contact: z
      .object({
        listIds: z.array(z.nativeEnum(ListIds)),
      })
      .strict(),
  })
  .strict()
  .partial()

export type UserUpdateDto = z.infer<typeof UserUpdateDto>

export const UpdateUserValidator = {
  body: UserUpdateDto,
  params: UserParams,
  query: z.object({}).strict().optional(),
}
