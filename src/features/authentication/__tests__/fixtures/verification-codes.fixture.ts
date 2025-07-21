import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import type supertest from 'supertest'
import { vi } from 'vitest'
import {
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../../adapters/brevo/__tests__/fixtures/server.fixture.js'
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
  expirationDate = expirationDate || dayjs().add(1, 'hour').toDate()

  vi.mocked(
    authenticationService
  ).generateVerificationCodeAndExpiration.mockReturnValueOnce({
    code,
    expirationDate,
  })

  const payload = {
    userId: userId || faker.string.uuid(),
    email: email || faker.internet.email(),
  }

  mswServer.use(brevoSendEmail(), brevoUpdateContact())

  const response = await agent
    .post(CREATE_VERIFICATION_CODE_ROUTE)
    .send(payload)
    .expect(StatusCodes.CREATED)

  await EventBus.flush()

  resetMswServer()

  vi.mocked(
    authenticationService
  ).generateVerificationCodeAndExpiration.mockRestore()

  return {
    ...response.body,
    code,
  }
}
