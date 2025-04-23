import type { Group, Organisation, Simulation, User } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'
import type { ModelToDto } from '../../../types/types'
import type { SimulationCreateNewsletterList } from '../simulations.validator'

type BaseSimulationUpsertedEventAttributes = {
  origin: string
  user: Pick<User, 'id' | 'name' | 'email'>
  simulation: Pick<
    Simulation,
    'id' | 'progression' | 'actionChoices' | 'computedResults' | 'date'
  >
  sendEmail: boolean
  created: boolean
  updated: boolean
}

type SimulationAttributes = BaseSimulationUpsertedEventAttributes &
  (
    | {
        group?: undefined
        administrator?: undefined
        organisation?: undefined
        newsletters: SimulationCreateNewsletterList
      }
    | {
        group: Pick<Group, 'id' | 'name'>
        administrator: Pick<User, 'id'>
        organisation?: undefined
        newsletters?: undefined
      }
    | {
        group?: undefined
        administrator?: undefined
        organisation: Pick<Organisation, 'name' | 'slug'>
        newsletters?: undefined
      }
  )

export class SimulationUpsertedEvent extends EventBusEvent<SimulationAttributes> {
  name = 'SimulationUpsertedEvent'
}

export class SimulationUpsertedAsyncEvent extends EventBusEvent<
  SimulationAttributes | ModelToDto<SimulationAttributes>
> {
  name = 'SimulationUpsertedAsyncEvent'
}
