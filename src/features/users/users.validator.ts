import { z } from 'zod'
import { ListIds } from '../../adapters/brevo/constant.js'
import { LocaleQuery } from '../../core/i18n/lang.validator.js'

export const UserParams = z
  .object({
    userId: z.uuid(),
  })
  .strict()

export type UserParams = z.infer<typeof UserParams>

export const FetchUserContactValidator = {
  body: z.object({}).strict().optional(),
  params: UserParams,
  query: LocaleQuery,
}

export const FetchMeValidator = {
  body: z.object({}).strict().optional(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
}

const UserUpdateDto = z
  .object({
    email: z.email().transform((email) => email.toLocaleLowerCase()),
    name: z.string(),
    contact: z
      .object({
        listIds: z.array(z.enum(ListIds)),
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
  .extend(LocaleQuery.shape)
  .strict()

export const UpdateUserValidator = {
  body: UserUpdateDto,
  params: UserParams,
  query: UserUpdateQuery,
}

const NewsletterConfirmationQuery = z
  .object({
    code: z.string().regex(/^\d{6}$/),
    origin: z.string().refine((url) => {
      try {
        return new URL(url).origin === url
      } catch {
        return false
      }
    }),
    email: z.email().transform((email) => email.toLocaleLowerCase()),
    listIds: z
      .union([
        z.coerce.number().positive(),
        z.array(z.coerce.number().positive()),
      ])
      .optional()
      .transform((listIds) =>
        typeof listIds === 'number' ? [listIds] : listIds || []
      ),
    // Params added by Brevo when first party cookies are enabled
    _se: z.string().optional(),
    _sc: z.string().optional(),
  })
  .extend(LocaleQuery.shape)
  .strict()

export type NewsletterConfirmationQuery = z.infer<
  typeof NewsletterConfirmationQuery
>

export const NewsletterConfirmationValidator = {
  body: z.object({}).optional(),
  params: UserParams,
  query: NewsletterConfirmationQuery,
}
