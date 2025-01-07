import { initContract, ZodErrorSchema } from '@ts-rest/core'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { EMAIL_REGEX } from '../../../../core/typeguards/isValidEmail'

const GenerateAPITokenRequestDto = z
  .object({
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
  })
  .strict()

export type GenerateAPITokenRequestDto = z.infer<
  typeof GenerateAPITokenRequestDto
>

const GenerateAPITokenResponseDto = z.object({
  message: z.string(),
})

const RecoverApiTokenQuery = z
  .object({
    code: z.string().regex(/^\d{6}$/),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
  })
  .strict()

export type RecoverApiTokenQuery = z.infer<typeof RecoverApiTokenQuery>

const RecoverApiTokenResponseDto = z.object({
  token: z.string(),
  refreshToken: z.string(),
})

const c = initContract()

const contract = c.router({
  generateApiToken: {
    method: 'POST',
    path: '/integrations-api/v1/tokens',
    query: z.object({}).strict(),
    pathParams: z.object({}).strict(),
    body: GenerateAPITokenRequestDto,
    responses: {
      [StatusCodes.CREATED as number]: GenerateAPITokenResponseDto,
      [StatusCodes.BAD_REQUEST as number]: ZodErrorSchema,
      [StatusCodes.INTERNAL_SERVER_ERROR as number]: z.object({}).strict(),
    },
    summary: 'Ask for an API token for the given email',
  },
  recoverApiToken: {
    method: 'GET',
    path: '/integrations-api/v1/tokens',
    query: RecoverApiTokenQuery,
    pathParams: z.object({}).strict(),
    responses: {
      [StatusCodes.OK as number]: RecoverApiTokenResponseDto,
      [StatusCodes.BAD_REQUEST as number]: ZodErrorSchema,
      [StatusCodes.INTERNAL_SERVER_ERROR as number]: z.object({}).strict(),
    },
    summary: 'Recover an API token from the given email',
  },
})

export default contract
