import type { Group, Organisation, Simulation, User } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'
import type { ModelToDto } from '../../../types/types'
import type { SimulationCreateNewsletterList } from '../simulations.validator'

type SimulationAttributes =
  | {
      origin: string
      user: Pick<User, 'id' | 'name' | 'email'>
      simulation: Pick<
        Simulation,
        'id' | 'progression' | 'actionChoices' | 'computedResults' | 'date'
      >
      group?: undefined
      administrator?: undefined
      organisation?: undefined
      newsletters: SimulationCreateNewsletterList
      sendEmail: boolean
    }
  | {
      origin: string
      user: Pick<User, 'id' | 'name' | 'email'>
      simulation: Pick<
        Simulation,
        'id' | 'progression' | 'actionChoices' | 'computedResults' | 'date'
      >
      group: Pick<Group, 'id' | 'name'>
      administrator: Pick<User, 'id'>
      organisation?: undefined
      newsletters?: undefined
      sendEmail: boolean
    }
  | {
      origin: string
      user: Pick<User, 'id' | 'name' | 'email'>
      simulation: Pick<
        Simulation,
        'id' | 'progression' | 'actionChoices' | 'computedResults' | 'date'
      >
      group?: undefined
      administrator?: undefined
      organisation: Pick<Organisation, 'name' | 'slug'>
      newsletters?: undefined
      sendEmail: boolean
    }

export class SimulationUpsertedEvent extends EventBusEvent<SimulationAttributes> {
  name = 'SimulationUpsertedEvent'
}

export class SimulationUpsertedAsyncEvent extends EventBusEvent<
  SimulationAttributes | ModelToDto<SimulationAttributes>
> {
  name = 'SimulationUpsertedAsyncEvent'
}
