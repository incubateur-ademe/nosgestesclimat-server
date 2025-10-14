import { z } from 'zod'
import { LocaleQuery } from '../../core/i18n/lang.validator.js'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail.js'
import { AUTHENTICATION_MODE } from './authentication.service.js'

export const VerificationCodeCreateDto = z
  .object({
    userId: z.string().uuid(),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
  })
  .strict()

export type VerificationCodeCreateDto = z.infer<
  typeof VerificationCodeCreateDto
>

export const VerificationCodeCreateQuery = LocaleQuery.extend({
  mode: z.nativeEnum(AUTHENTICATION_MODE).optional(),
})

export type VerificationCodeCreateQuery = z.infer<
  typeof VerificationCodeCreateQuery
>

export const VerificationCodeCreateValidator = {
  body: VerificationCodeCreateDto,
  params: z.object({}).strict().optional(),
  query: VerificationCodeCreateQuery.optional(),
}
