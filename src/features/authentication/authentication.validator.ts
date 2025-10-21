import { z } from 'zod'
import { LocaleQuery } from '../../core/i18n/lang.validator.js'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail.js'

export const LoginDto = z
  .object({
    userId: z.string().uuid(),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
    code: z.string().regex(/^\d{6}$/),
  })
  .strict()

export type LoginDto = z.infer<typeof LoginDto>

export const LoginValidator = {
  body: LoginDto,
  params: z.object({}).strict().optional(),
  query: LocaleQuery.optional(),
}
