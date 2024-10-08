import z from 'zod'
import { EMAIL_REGEX } from '../../core/typeguards/isValidEmail'

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

export const VerificationCodeCreateValidator = {
  body: VerificationCodeCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
