import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import nock from 'nock'
import type supertest from 'supertest'
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

  jest
    .mocked(authenticationService)
    .generateVerificationCodeAndExpiration.mockReturnValueOnce({
      code,
      expirationDate,
    })

  const payload = {
    userId: userId || faker.string.uuid(),
    email: email || faker.internet.email(),
  }

  nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

  const response = await agent
    .post(CREATE_VERIFICATION_CODE_ROUTE)
    .send(payload)

  jest
    .mocked(authenticationService)
    .generateVerificationCodeAndExpiration.mockRestore()

  return {
    ...response.body,
    code,
  }
}