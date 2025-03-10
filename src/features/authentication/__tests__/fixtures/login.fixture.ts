import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import type supertest from 'supertest'
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

  nock(process.env.BREVO_URL!).post('/v3/contacts').reply(200)

  const response = await agent
    .post(LOGIN_ROUTE)
    .send({
      userId,
      email,
      code,
    })
    .expect(StatusCodes.OK)

  await EventBus.flush()

  expect(nock.isDone()).toBeTruthy()

  const [cookie] = response.headers['set-cookie']

  return {
    cookie,
    userId,
    email,
  }
}
