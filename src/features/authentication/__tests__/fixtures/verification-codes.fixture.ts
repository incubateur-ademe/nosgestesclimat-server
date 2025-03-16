import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import type supertest from 'supertest'
import { expect, vi } from 'vitest'
import { EventBus } from '../../../../core/event-bus/event-bus'
import * as authenticationService from '../../authentication.service'
import type { VerificationCodeCreateDto } from '../../verification-codes.validator'

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

  nock(process.env.BREVO_URL!)
    .post('/v3/smtp/email')
    .reply(200)
    .post('/v3/contacts')
    .reply(200)

  const response = await agent
    .post(CREATE_VERIFICATION_CODE_ROUTE)
    .send(payload)
    .expect(StatusCodes.CREATED)

  await EventBus.flush()

  expect(nock.isDone()).toBeTruthy()

  vi.mocked(
    authenticationService
  ).generateVerificationCodeAndExpiration.mockRestore()

  return {
    ...response.body,
    code,
  }
}
