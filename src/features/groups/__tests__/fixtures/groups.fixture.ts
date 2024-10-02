import { faker } from '@faker-js/faker'
import type supertest from 'supertest'
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
  participant?: Partial<ParticipantInputCreateDto>
  groupId: string
}) => {
  const payload: ParticipantInputCreateDto = {
    userId: userId || faker.string.uuid(),
    name: name || faker.person.fullName(),
    simulation: simulation || getSimulationPayload(),
    email,
  }

  const response = await agent
    .post(CREATE_PARTICIPANT_ROUTE.replace(':groupId', groupId))
    .send(payload)

  return response.body
}
