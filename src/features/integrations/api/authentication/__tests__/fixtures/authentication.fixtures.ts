import { faker } from '@faker-js/faker'
import {
  ApiScopeName,
  type IntegrationApiScope,
  type IntegrationWhitelist,
  type PrismaClient,
} from '@prisma/client'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import type supertest from 'supertest'
import { EventBus } from '../../../../../../core/event-bus/event-bus'
import * as authenticationService from '../../../../../authentication/authentication.service'

type TestAgent = ReturnType<typeof supertest>

export const GENERATE_API_TOKEN_ROUTE = '/integrations-api/v1/tokens'

export const RECOVER_API_TOKEN_ROUTE = '/integrations-api/v1/tokens'

export const REFRESH_API_TOKEN_ROUTE = '/integrations-api/v1/tokens/refresh'

const apiScopeNames = Object.values(ApiScopeName)

export const randomApiScopeName = (scopes = apiScopeNames) =>
  scopes[Math.floor(Math.random() * scopes.length)]

export const createIntegrationEmailWhitelist = ({
  prisma,
  apiScope = {},
  integrationWhitelist = {},
}: {
  apiScope?: Partial<IntegrationApiScope>
  integrationWhitelist?: Partial<
    Pick<IntegrationWhitelist, 'emailPattern' | 'description'>
  >
  prisma: PrismaClient
}) => {
  const apiScopeData = {
    name: ApiScopeName.ngc,
    description: 'Scope for test',
    ...apiScope,
  }

  const integrationEmailWhitelistData = {
    emailPattern: faker.internet.email().toLocaleLowerCase(),
    description: 'Pattern for test',
    ...integrationWhitelist,
  }

  return prisma.integrationWhitelist.create({
    data: {
      ...integrationEmailWhitelistData,
      apiScope: {
        connectOrCreate: {
          where: {
            name: apiScopeData.name,
          },
          create: {
            ...apiScopeData,
          },
        },
      },
    },
    select: {
      emailPattern: true,
      description: true,
      apiScope: {
        select: {
          name: true,
          description: true,
        },
      },
    },
  })
}

export const generateApiToken = async ({
  code,
  agent,
  email,
  expirationDate,
  ...emailWhiteListParams
}: {
  code?: string
  expirationDate?: Date
  email?: string
  apiScope?: Partial<IntegrationApiScope>
  integrationWhitelist?: Partial<
    Pick<IntegrationWhitelist, 'emailPattern' | 'description'>
  >
  prisma: PrismaClient
  agent: TestAgent
}) => {
  code = code || faker.number.int({ min: 100000, max: 999999 }).toString()
  expirationDate = expirationDate || dayjs().add(1, 'hour').toDate()

  const emailWhitelist =
    await createIntegrationEmailWhitelist(emailWhiteListParams)

  jest
    .mocked(authenticationService)
    .generateVerificationCodeAndExpiration.mockReturnValueOnce({
      code,
      expirationDate,
    })

  const payload = {
    email: email || emailWhitelist.emailPattern,
  }

  nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

  const response = await agent
    .post(GENERATE_API_TOKEN_ROUTE)
    .send(payload)
    .expect(StatusCodes.CREATED)

  await EventBus.flush()

  expect(nock.isDone()).toBeTruthy()

  jest
    .mocked(authenticationService)
    .generateVerificationCodeAndExpiration.mockRestore()

  return {
    emailWhitelist,
    ...response.body,
    ...payload,
    code,
  }
}

export const recoverApiToken = async ({
  apiScope,
  prisma,
  agent,
  email: userEmail,
}: {
  email?: string
  apiScope?: Partial<IntegrationApiScope>
  prisma: PrismaClient
  agent: TestAgent
}) => {
  const { code, email, emailWhitelist } = await generateApiToken({
    apiScope,
    prisma,
    agent,
    email: userEmail,
  })

  const response = await agent
    .get(RECOVER_API_TOKEN_ROUTE)
    .query({
      email,
      code,
    })
    .expect(StatusCodes.OK)

  await EventBus.flush()

  return {
    ...response.body,
    emailWhitelist,
    email,
    code,
  }
}
