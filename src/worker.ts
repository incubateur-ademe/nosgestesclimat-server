import { redis } from './adapters/redis/client'
import { CHANNELS } from './adapters/redis/constant'
import { EventBus } from './core/event-bus/event-bus'
import { LoginEvent } from './features/authentication/events/Login.event'
import { VerificationCodeCreatedEvent } from './features/authentication/events/VerificationCodeCreated.event'
import { GroupCreatedEvent } from './features/groups/events/GroupCreated.event'
import { GroupDeletedEvent } from './features/groups/events/GroupDeleted.event'
import { GroupUpdatedEvent } from './features/groups/events/GroupUpdated.event'
import { OrganisationCreatedEvent } from './features/organisations/events/OrganisationCreated.event'
import { OrganisationUpdatedEvent } from './features/organisations/events/OrganisationUpdated.event'
import { PollCreatedEvent } from './features/organisations/events/PollCreated.event'
import { PollDeletedEvent } from './features/organisations/events/PollDeletedEvent'
import { PollUpdatedEvent } from './features/organisations/events/PollUpdated.event'
import { SimulationUpsertedEvent } from './features/simulations/events/SimulationUpserted.event'
import { UserUpdatedEvent } from './features/users/events/UserUpdated.event'
import logger from './logger'

const RedisApiEventMap = {
  LoginEvent,
  VerificationCodeCreatedEvent,
  GroupCreatedEvent,
  GroupDeletedEvent,
  GroupUpdatedEvent,
  OrganisationCreatedEvent,
  OrganisationUpdatedEvent,
  PollCreatedEvent,
  PollDeletedEvent,
  PollUpdatedEvent,
  SimulationUpsertedEvent,
  UserUpdatedEvent,
} as const

const parseMessage = (message: string) => {
  const { name, attributes } = JSON.parse(message)

  return new RedisApiEventMap[name as keyof typeof RedisApiEventMap](attributes)
}

redis.subscribe(CHANNELS.apiEvents, () => {
  console.log(`Worker listening  ${CHANNELS.apiEvents}`)
})

redis.on('message', async (_, message) => {
  try {
    const event = parseMessage(message)

    EventBus.emit(event)

    await EventBus.once(event)
  } catch (err) {
    logger.error('Redis api event failure', err)
  }
})
