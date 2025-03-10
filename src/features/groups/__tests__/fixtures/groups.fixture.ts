import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import type supertest from 'supertest'
import { prisma } from '../../../../adapters/prisma/client'
import { EventBus } from '../../../../core/event-bus/event-bus'
import { getSimulationPayload } from '../../../simulations/__tests__/fixtures/simulations.fixtures'
import type {
  GroupCreateInputDto,
  ParticipantInputCreateDto,
} from '../../groups.validator'

type TestAgent = ReturnType<typeof supertest>

export const CREATE_GROUP_ROUTE = '/groups/v1'

export const UPDATE_USER_GROUP_ROUTE = '/groups/v1/:userId/:groupId'

export const CREATE_PARTICIPANT_ROUTE = '/groups/v1/:groupId/participants'

export const DELETE_PARTICIPANT_ROUTE =
  '/groups/v1/:userId/:groupId/participants/:participantId'

export const FETCH_USER_GROUPS_ROUTE = '/groups/v1/:userId'

export const FETCH_USER_GROUP_ROUTE = '/groups/v1/:userId/:groupId'

export const DELETE_USER_GROUP_ROUTE = '/groups/v1/:userId/:groupId'

export const createGroup = async ({
  agent,
  group: { administrator, participants, emoji, name } = {},
}: {
  agent: TestAgent
  group?: Partial<GroupCreateInputDto>
}) => {
  const payload: GroupCreateInputDto = {
    emoji: emoji || faker.internet.emoji(),
    name: name || faker.company.name(),
    administrator: administrator || {
      userId: faker.string.uuid(),
      name: faker.person.fullName(),
    },
    participants,
  }

  const scope = nock(process.env.BREVO_URL!)

  if (payload.administrator.email && participants?.length) {
    scope
      .post('/v3/smtp/email')
      .reply(200)
      .post('/v3/contacts')
      .reply(200)
      .post('/v3/contacts')
      .reply(200)
      .post('/v3/contacts/lists/35/contacts/remove')
      .reply(400, { code: 'invalid_parameter' })
  }

  const response = await agent
    .post(CREATE_GROUP_ROUTE)
    .send(payload)
    .expect(StatusCodes.CREATED)

  await EventBus.flush()

  expect(nock.isDone()).toBeTruthy()

  return response.body
}

export const joinGroup = async ({
  agent,
  participant: { userId, email, name, simulation } = {},
  groupId,
}: {
  agent: TestAgent
  participant?: Partial<ParticipantInputCreateDto>
  groupId: string
}) => {
  const payload: ParticipantInputCreateDto = {
    userId: userId || faker.string.uuid(),
    name: name || faker.person.fullName(),
    simulation: simulation || getSimulationPayload(),
    email,
  }

  const scope = nock(process.env.BREVO_URL!)

  const [existingUser, group, existingParticipant] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: payload.userId,
      },
      select: {
        email: true,
      },
    }),
    prisma.group.findUniqueOrThrow({
      where: {
        id: groupId,
      },
      select: {
        administrator: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        participants: {
          select: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
    ...(email
      ? [
          prisma.groupParticipant.findFirst({
            where: {
              user: {
                email,
              },
            },
            select: {
              id: true,
            },
          }),
        ]
      : []),
  ])

  if (email || existingUser?.email) {
    if (!existingParticipant) {
      scope.post('/v3/smtp/email').reply(200)
    }

    scope.post('/v3/contacts').reply(200)

    if (payload.simulation.progression === 1) {
      scope
        .post('/v3/contacts/lists/35/contacts/remove')
        .reply(400, { code: 'invalid_parameter' })
    }
  }

  const administrator = group.administrator?.user
  const participants = group.participants

  if (
    administrator?.email &&
    participants.some(({ user }) => user.id === administrator.id)
  ) {
    scope.post('/v3/contacts').reply(200)
  }

  const response = await agent
    .post(CREATE_PARTICIPANT_ROUTE.replace(':groupId', groupId))
    .send(payload)
    .expect(StatusCodes.CREATED)

  await EventBus.flush()

  expect(nock.isDone()).toBeTruthy()

  return response.body
}
