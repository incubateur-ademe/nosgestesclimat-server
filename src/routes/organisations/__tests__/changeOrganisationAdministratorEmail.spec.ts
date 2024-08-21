jest.mock('../../../utils/generateRandomNumberWithLength')

import { faker } from '@faker-js/faker'
import nock from 'nock'
import supertest from 'supertest'
import app from '../../../app'
import * as verificationCodeUtils from '../../../utils/generateRandomNumberWithLength'
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

  describe(`When the administator changes its email`, () => {
    let email: string
    let scope: nock.Scope

    beforeEach(async () => {
      jest
        .mocked(verificationCodeUtils)
        .generateRandomNumberWithLength.mockImplementationOnce(
          () => +createFullOrganisationFixture.verificationCode
        )

      scope = nock(process.env.BREVO_URL!)
        .post(`/v3/contacts`)
        .reply(200)
        .post(`/v3/smtp/email`)
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
