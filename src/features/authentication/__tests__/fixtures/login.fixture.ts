import type supertest from 'supertest'
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

  const response = await agent.post(LOGIN_ROUTE).send({
    userId,
    email,
    code,
  })

  const [cookie] = response.headers['set-cookie']

  return {
    cookie,
    userId,
    email,
  }
}
