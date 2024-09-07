import { faker } from '@faker-js/faker'
import type supertest from 'supertest'
import type {
  GroupCreateDto,
  ParticipantCreateDto,
} from '../../groups.validator'

type TestAgent = ReturnType<typeof supertest>

export const CREATE_GROUP_ROUTE = '/groups'

export const UPDATE_USER_GROUP_ROUTE = '/groups/:userId/:groupId'

export const CREATE_PARTICIPANT_ROUTE = '/groups/:groupId/participants'

export const DELETE_PARTICIPANT_ROUTE =
  '/groups/:userId/:groupId/participants/:participantId'

export const FETCH_USER_GROUPS_ROUTE = '/groups/:userId'

export const FETCH_USER_GROUP_ROUTE = '/groups/:userId/:groupId'

export const createGroup = async ({
  agent,
  group: { administrator, participants, emoji, name } = {},
}: {
  agent: TestAgent
  group?: Partial<GroupCreateDto>
}) => {
  const payload: GroupCreateDto = {
    emoji: emoji || faker.internet.emoji(),
    name: name || faker.company.name(),
    administrator: administrator || {
      userId: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
    },
    participants,
  }

  const response = await agent.post(CREATE_GROUP_ROUTE).send(payload)

  return response.body
}

export const joinGroup = async ({
  agent,
  participant: { userId, email, name, simulation } = {},
  groupId,
}: {
  agent: TestAgent
  participant?: Partial<ParticipantCreateDto>
  groupId: string
}) => {
  const payload: ParticipantCreateDto = {
    userId: userId || faker.string.uuid(),
    name: name || faker.person.fullName(),
    simulation: simulation || faker.string.uuid(),
    email,
  }

  const response = await agent
    .post(CREATE_PARTICIPANT_ROUTE.replace(':groupId', groupId))
    .send(payload)

  return response.body
}
