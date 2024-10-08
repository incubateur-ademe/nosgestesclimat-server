import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import nock from 'nock'
import type supertest from 'supertest'
import * as authenticationService from '../../../../features/authentication/authentication.service'

type TestAgent = ReturnType<typeof supertest>

const NGC_JWT_REGEX = new RegExp('ngcjwt=(.*);.*')

export const CREATE_ORGANISATION_ROUTE = '/organisations/create'

export const VALIDATE_ORGANISATION_VERIFICATION_CODE_ROUTE =
  '/organisations/validate-verification-code'

export const FETCH_ORGANISATION_ROUTE = '/organisations/fetch-organisation'

export const UPDATE_ORGANISATION_ROUTE = '/organisations/update'

export const SEND_ORGANISATION_VERIFICATION_CODE_WHEN_MODIFYING_EMAIL_ROUTE =
  '/organisations/send-verification-code-when-modifying-email'

export const createOrganisation = async (agent: TestAgent) => {
  const userId = faker.string.uuid()
  const email = faker.internet.email().toLocaleLowerCase()
  const verificationCode = faker.number
    .int({ min: 100000, max: 999999 })
    .toString()

  jest
    .mocked(authenticationService)
    .generateVerificationCodeAndExpiration.mockReturnValueOnce({
      code: verificationCode,
      expirationDate: dayjs().add(1, 'hour').toDate(),
    })

  nock(process.env.BREVO_URL!)
    .post(`/v3/contacts`)
    .reply(200)
    .post(`/v3/smtp/email`)
    .reply(200)

  await agent.post(CREATE_ORGANISATION_ROUTE).send({
    email,
    userId,
  })

  return {
    verificationCode,
    userId,
    email,
  }
}

export const validateOrganisation = async (agent: TestAgent) => {
  const { verificationCode, userId, email } = await createOrganisation(agent)

  const validateOrganisationResponse = await agent
    .post(VALIDATE_ORGANISATION_VERIFICATION_CODE_ROUTE)
    .send({
      email,
      verificationCode: verificationCode,
    })

  const cookies = validateOrganisationResponse.get('Set-Cookie')
  const cookie = cookies?.pop()?.match(NGC_JWT_REGEX)?.slice(1).shift() || ''

  return {
    verificationCode,
    cookie,
    userId,
    email,
  }
}

export const createFullOrganisation = async (agent: TestAgent) => {
  const { verificationCode, cookie, userId, email } =
    await validateOrganisation(agent)

  const name = faker.company.name()
  const administratorName = faker.person.fullName()

  nock(process.env.BREVO_URL!).post(`/v3/contacts`).reply(200)
  nock(process.env.CONNECT_URL!).post(`/`).reply(200)

  const updateOrganisationResponse = await agent
    .post(UPDATE_ORGANISATION_ROUTE)
    .set({ cookie: `ngcjwt=${cookie}` })
    .send({
      email,
      name,
      administratorName,
    })

  const { body: organisation } = updateOrganisationResponse

  return {
    verificationCode,
    organisation,
    cookie,
    userId,
    email,
  }
}
