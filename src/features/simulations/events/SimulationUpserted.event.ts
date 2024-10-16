import type { Group, Organisation, Simulation, User } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class SimulationUpsertedEvent extends EventBusEvent<
  | {
      origin: string
      user: Pick<User, 'id' | 'email'>
      simulation: Pick<Simulation, 'id' | 'progression'>
      group?: undefined
      administrator?: undefined
      organisation?: undefined
    }
  | {
      origin: string
      user: Pick<User, 'id' | 'name' | 'email'>
      simulation?: Pick<Simulation, 'id' | 'progression'>
      group: Pick<Group, 'id' | 'name'>
      administrator: Pick<User, 'id'>
      organisation?: undefined
    }
  | {
      origin: string
      user: Pick<User, 'id' | 'email'>
      simulation?: undefined
      group?: undefined
      administrator?: undefined
      organisation: Pick<Organisation, 'name' | 'slug'>
    }
> {}
