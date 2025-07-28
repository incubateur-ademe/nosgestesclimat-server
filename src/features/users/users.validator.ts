import { z } from 'zod'
import { ListIds } from '../../adapters/brevo/constant.js'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail.js'

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

export const UserUpdateDto = z
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

const UserUpdateQuery = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict()

export const UpdateUserValidator = {
  body: UserUpdateDto,
  params: UserParams,
  query: UserUpdateQuery,
}

export const NewsletterConfirmationQuery = z
  .object({
    code: z.string().regex(/^\d{6}$/),
    origin: z.string().refine((url) => {
      try {
        return new URL(url).origin === url
      } catch {
        return false
      }
    }),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
    listIds: z
      .union([
        z.coerce.number().positive(),
        z.array(z.coerce.number().positive()),
      ])
      .optional()
      .transform((listIds) =>
        typeof listIds === 'number' ? [listIds] : listIds || []
      ),
  })
  .strict()

export type NewsletterConfirmationQuery = z.infer<
  typeof NewsletterConfirmationQuery
>

export const NewsletterConfirmationValidator = {
  body: z.object({}).optional(),
  params: UserParams,
  query: NewsletterConfirmationQuery,
}
