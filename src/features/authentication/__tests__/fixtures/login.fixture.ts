import { StatusCodes } from 'http-status-codes'
import type supertest from 'supertest'
import { brevoUpdateContact } from '../../../../adapters/brevo/__tests__/fixtures/server.fixture'
import {
  mswServer,
  resetMswServer,
} from '../../../../core/__tests__/fixtures/server.fixture'
import { EventBus } from '../../../../core/event-bus/event-bus'
import type { VerificationCodeCreateDto } from '../../verification-codes.validator'
import { createVerificationCode } from './verification-codes.fixture'

type TestAgent = ReturnType<typeof supertest>

export const LOGIN_ROUTE = '/authentication/v1/login'

export const login = async ({
  agent,
  verificationCode,
}: {
  agent: TestAgent
  verificationCode?: Partial<VerificationCodeCreateDto>
}) => {
  const { userId, email, code } = await createVerificationCode({
    agent,
    verificationCode,
  })

  mswServer.use(brevoUpdateContact())

  const response = await agent
    .post(LOGIN_ROUTE)
    .send({
      userId,
      email,
      code,
    })
    .expect(StatusCodes.OK)

  await EventBus.flush()

  resetMswServer()

  const [cookie] = response.headers['set-cookie']

  return {
    cookie,
    email,
    userId,
  }
}
