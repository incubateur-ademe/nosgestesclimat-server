import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import type supertest from 'supertest'
import { vi } from 'vitest'
import { formatBrevoDate } from '../../../../adapters/brevo/__tests__/fixtures/formatBrevoDate'
import {
  brevoGetContact,
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../../adapters/brevo/__tests__/fixtures/server.fixture'
import type { BrevoContactDto } from '../../../../adapters/brevo/client'
import { ListIds } from '../../../../adapters/brevo/constant'
import {
  mswServer,
  resetMswServer,
} from '../../../../core/__tests__/fixtures/server.fixture'
import { EventBus } from '../../../../core/event-bus/event-bus'
import * as authenticationService from '../../../authentication/authentication.service'
import type { UserUpdateDto } from '../../users.validator'

type TestAgent = ReturnType<typeof supertest>

export const UPDATE_USER_ROUTE = '/users/v1/:userId'

export const getBrevoContact = (
  contact: Partial<BrevoContactDto> = {}
): BrevoContactDto => ({
  email: contact.email ?? faker.internet.email(),
  id: contact.id ?? faker.number.int(),
  emailBlacklisted: contact.emailBlacklisted ?? faker.datatype.boolean(),
  smsBlacklisted: contact.smsBlacklisted ?? faker.datatype.boolean(),
  createdAt: contact.createdAt ?? formatBrevoDate(faker.date.past()),
  modifiedAt: contact.modifiedAt ?? formatBrevoDate(faker.date.recent()),
  attributes: {
    ...contact.attributes,
    USER_ID: contact.attributes?.USER_ID ?? faker.string.uuid(),
    PRENOM: contact.attributes?.PRENOM ?? null,
  },
  listIds: contact.listIds ?? [],
  statistics: contact.statistics ?? {},
})

export const createUser = async ({
  agent,
  user: { id, name, email } = {},
}: {
  agent: TestAgent
  user?: Partial<UserUpdateDto> & { id?: string }
}) => {
  const userId = id || faker.string.uuid()
  let contact: BrevoContactDto | undefined

  if (email) {
    contact = getBrevoContact({
      email,
      attributes: {
        USER_ID: userId,
      },
    })

    mswServer.use(
      brevoGetContact(email, {
        customResponses: [
          {
            body: {
              code: 'document_not_found',
              message: 'List ID does not exist',
            },
            status: StatusCodes.NOT_FOUND,
          },
          {
            body: contact,
          },
        ],
      }),
      brevoUpdateContact()
    )
  }

  const response = await agent
    .put(UPDATE_USER_ROUTE.replace(':userId', userId))
    .send({ name, email })
    .expect(StatusCodes.OK)

  await EventBus.flush()

  resetMswServer()

  return {
    user: response.body,
    contact,
  }
}

export const subscribeToNewsLetter = async ({
  code,
  agent,
  expirationDate,
  user: { id, name, email, contact } = {},
}: {
  agent: TestAgent
  user?: Partial<UserUpdateDto> & { id?: string }
  code?: string
  expirationDate?: Date
}) => {
  code = code || faker.number.int({ min: 100000, max: 999999 }).toString()
  expirationDate = expirationDate || dayjs().add(1, 'hour').toDate()

  vi.mocked(
    authenticationService
  ).generateVerificationCodeAndExpiration.mockReturnValueOnce({
    code,
    expirationDate,
  })

  email = email || faker.internet.email().toLocaleLowerCase()

  const listIds = contact?.listIds.length
    ? contact?.listIds
    : [ListIds.MAIN_NEWSLETTER]

  const payload: UserUpdateDto = {
    contact: contact || { listIds },
    email,
    name,
  }

  mswServer.use(
    brevoGetContact(email, {
      customResponses: [
        {
          body: {
            code: 'document_not_found',
            message: 'List ID does not exist',
          },
          status: StatusCodes.NOT_FOUND,
        },
      ],
    }),
    brevoSendEmail()
  )

  const response = await agent
    .put(UPDATE_USER_ROUTE.replace(':userId', id || faker.string.uuid()))
    .send(payload)
    .expect(StatusCodes.ACCEPTED)

  await EventBus.flush()

  resetMswServer()

  vi.mocked(
    authenticationService
  ).generateVerificationCodeAndExpiration.mockRestore()

  return {
    ...response.body,
    listIds,
    code,
  }
}
