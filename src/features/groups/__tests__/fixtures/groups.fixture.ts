import { faker } from '@faker-js/faker'
import type supertest from 'supertest'
import type { GroupCreateDto } from '../../groups.validator'

type TestAgent = ReturnType<typeof supertest>

export const CREATE_GROUP_ROUTE = '/groups'

export const UPDATE_USER_GROUP_ROUTE = '/groups/:userId/:groupId'

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
