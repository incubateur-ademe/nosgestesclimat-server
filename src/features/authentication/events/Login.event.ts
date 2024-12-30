import { EventBusEvent } from '../../../core/event-bus/event'

export class LoginEvent extends EventBusEvent<{
  email: string
  userId?: string | null
}> {}
