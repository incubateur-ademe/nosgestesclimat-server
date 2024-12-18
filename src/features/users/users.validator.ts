import z from 'zod'
import { ListIds } from '../../adapters/brevo/constant'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'

export const UserParams = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type UserParams = z.infer<typeof UserParams>

export const FetchUserBrevoContactValidator = {
  body: z.object({}).strict().optional(),
  params: UserParams,
  query: z.object({}).strict().optional(),
}

const UserBrevoContactUpdateDto = z
  .object({
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
    listIds: z.array(z.nativeEnum(ListIds)),
  })
  .strict()

export type UserBrevoContactUpdateDto = z.infer<
  typeof UserBrevoContactUpdateDto
>

export const UpdateUserBrevoContactValidator = {
  body: UserBrevoContactUpdateDto,
  params: UserParams,
  query: z.object({}).strict().optional(),
}
