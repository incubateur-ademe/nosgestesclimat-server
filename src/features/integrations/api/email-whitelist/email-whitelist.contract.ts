import { ApiScopeName } from '@prisma/client'
import { initContract, ZodErrorSchema } from '@ts-rest/core'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { EMAIL_REGEX } from '../../../../core/typeguards/isValidEmail'

const EmailWhitelistCreateDto = z
  .object({
    scope: z.nativeEnum(ApiScopeName),
    emailPattern: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((emailPattern) => emailPattern.toLocaleLowerCase()),
    description: z.string().min(10),
  })
  .strict()

export type EmailWhitelistCreateDto = z.infer<typeof EmailWhitelistCreateDto>

const EmailWhitelistDto = z
  .object({
    scope: z.nativeEnum(ApiScopeName),
    emailPattern: z.string(),
    description: z.string(),
  })
  .strict()

const c = initContract()

const contract = c.router({
  createEmailWhitelist: {
    method: 'POST',
    path: '/integrations-api/v1/email-whitelists',
    query: z.object({}).strict(),
    pathParams: z.object({}).strict(),
    body: EmailWhitelistCreateDto,
    responses: {
      [StatusCodes.CREATED as number]: EmailWhitelistDto,
      [StatusCodes.BAD_REQUEST as number]: ZodErrorSchema,
      [StatusCodes.UNAUTHORIZED as number]: z.string(),
      [StatusCodes.FORBIDDEN as number]: z.string(),
      [StatusCodes.NOT_FOUND as number]: z.string(),
      [StatusCodes.INTERNAL_SERVER_ERROR as number]: z.object({}).strict(),
    },
    summary: 'Creates an email whitelist for the given API scope',
    metadata: {
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  },
})

export default contract
