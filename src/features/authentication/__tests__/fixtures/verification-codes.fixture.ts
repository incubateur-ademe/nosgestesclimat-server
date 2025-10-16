import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import type supertest from 'supertest'
import { vi } from 'vitest'
import {
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../../adapters/brevo/__tests__/fixtures/server.fixture.js'
import { prisma } from '../../../../adapters/prisma/client.js'
import { redis } from '../../../../adapters/redis/client.js'
import { KEYS } from '../../../../adapters/redis/constant.js'
import {
  mswServer,
  resetMswServer,
} from '../../../../core/__tests__/fixtures/server.fixture.js'
import { EventBus } from '../../../../core/event-bus/event-bus.js'
import * as authenticationService from '../../authentication.service.js'
import type { VerificationCodeCreateDto } from '../../verification-codes.validator.js'

type TestAgent = ReturnType<typeof supertest>

export const CREATE_VERIFICATION_CODE_ROUTE = '/verification-codes/v1'

export const createVerificationCode = async ({
  code,
  agent,
  expirationDate,
  verificationCode: { email, userId } = {},
}: {
  code?: string
  agent: TestAgent
  expirationDate?: Date
  verificationCode?: Partial<VerificationCodeCreateDto>
}) => {
  code = code || faker.number.int({ min: 100000, max: 999999 }).toString()

  vi.mocked(
    authenticationService
  ).generateRandomVerificationCode.mockReturnValueOnce(code)

  const payload = {
    userId: userId || faker.string.uuid(),
    email: email || faker.internet.email(),
  }

  mswServer.use(brevoSendEmail(), brevoUpdateContact())

  const response = await agent
    .post(CREATE_VERIFICATION_CODE_ROUTE)
    .send(payload)
    .expect(StatusCodes.CREATED)

  await Promise.all([
    EventBus.flush(),
    new Promise<void>((res, rej) => {
      redis.keys(`${KEYS.rateLimitSameRequests}_*`, async (err, keys) =>
        err
          ? rej(err)
          : redis.del(keys || [], (err) => (err ? rej(err) : res()))
      )
    }),
    ...(expirationDate
      ? [
          prisma.verificationCode.updateMany({
            data: {
              expirationDate,
            },
          }),
        ]
      : []),
  ])

  resetMswServer()

  vi.mocked(authenticationService).generateRandomVerificationCode.mockRestore()

  return {
    ...response.body,
    code,
  }
}
