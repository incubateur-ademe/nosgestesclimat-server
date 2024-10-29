import {
  addOrUpdateContactAfterIncompleteSimulationCreated,
  addOrUpdateContactAfterSimulationCreated,
} from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'
import { getIncompleteSimulationsCount } from '../simulations.repository'
import type {
  ActionChoicesSchema,
  ComputedResultSchema,
} from '../simulations.validator'

export const updateBrevoContact: Handler<SimulationUpsertedEvent> = async ({
  attributes,
  attributes: {
    simulation: {
      progression,
      actionChoices,
      computedResults,
      date: lastSimulationDate,
    },
    user: { id: userId, email, name },
    newsletters,
  },
}) => {
  if (!email) {
    return
  }

  if (progression === 1) {
    let subscribeToGroupNewsletter = false
    if (attributes.group) {
      const { administrator } = attributes
      subscribeToGroupNewsletter = userId !== administrator.id
    }

    return addOrUpdateContactAfterSimulationCreated({
      name,
      email,
      userId,
      newsletters,
      actionChoices: actionChoices as ActionChoicesSchema,
      computedResults: computedResults as ComputedResultSchema,
      lastSimulationDate,
      subscribeToGroupNewsletter,
      incompleteSumulations: await getIncompleteSimulationsCount({
        userId,
        userEmail: email,
      }),
    })
  } else if (!attributes.group && !attributes.organisation) {
    return addOrUpdateContactAfterIncompleteSimulationCreated({
      name,
      email,
      userId,
    })
  }
}
