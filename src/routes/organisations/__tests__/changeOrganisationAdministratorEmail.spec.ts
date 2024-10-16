import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import * as authenticationService from '../../../features/authentication/authentication.service'
import {
  SEND_ORGANISATION_VERIFICATION_CODE_WHEN_MODIFYING_EMAIL_ROUTE,
  createFullOrganisation,
} from './fixtures/organisations.fixture'

describe(`Given an existing NGC user organisation`, () => {
  const url = SEND_ORGANISATION_VERIFICATION_CODE_WHEN_MODIFYING_EMAIL_ROUTE
  const request = supertest(app)
  let createFullOrganisationFixture: Awaited<
    ReturnType<typeof createFullOrganisation>
  >

  beforeEach(async () => {
    createFullOrganisationFixture = await createFullOrganisation(request)
  })

  afterEach(() =>
    Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
    ])
  )

  describe(`When the administator changes its email`, () => {
    let email: string
    let scope: nock.Scope

    beforeEach(async () => {
      jest
        .mocked(authenticationService)
        .generateVerificationCodeAndExpiration.mockReturnValueOnce({
          code: createFullOrganisationFixture.verificationCode,
          expirationDate: dayjs().add(1, 'hour').toDate(),
        })

      scope = nock(process.env.BREVO_URL!)
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/smtp/email')
        .reply(200)

      email = faker.internet.email().toLocaleLowerCase()
      await request.post(url).send({
        previousEmail: createFullOrganisationFixture.email,
        email,
      })
    })

    it(`Then it sends an email to the new address with a verification code`, () => {
      expect(scope.isDone()).toBe(true)
    })
  })
})
