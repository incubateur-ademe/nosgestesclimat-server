import {
  ATTRIBUTE_ACTIONS_SELECTED_NUMBER,
  ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_DATE,
  ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT,
  ATTRIBUTE_OPT_IN,
  ATTRIBUTE_PRENOM,
  ATTRIBUTE_USER_ID,
} from '../../constants/brevo'
import { SimulationType } from '../../schemas/SimulationSchema'
import { Attributes } from '../../types/types'

type Props = {
  name?: string
  userId?: string
  optin?: boolean
  simulation?: SimulationType
  otherAttributes?: Attributes
}

export function handleAddAttributes({
  name,
  userId,
  optin,
  simulation,
  otherAttributes,
}: Props) {
  const attributesUpdated = {
    ...otherAttributes,
  }

  if (name) {
    attributesUpdated[ATTRIBUTE_PRENOM] = name
  }

  if (optin !== undefined) {
    attributesUpdated[ATTRIBUTE_OPT_IN] = optin
  }

  if (userId) {
    attributesUpdated[ATTRIBUTE_USER_ID] = userId
  }

  if (simulation) {
    const {
      actionChoices,
      computedResults: {
        bilan = 0,
        categories: {
          alimentation = 0,
          divers = 0,
          logement = 0,
          transport = 0,
          'services sociétaux': serviceSocietaux = 0,
        } = {},
      } = {},
    } = simulation
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_DATE] = new Date().toISOString()
    attributesUpdated[ATTRIBUTE_ACTIONS_SELECTED_NUMBER] = actionChoices
      ? (Object.keys(actionChoices)?.filter(
          (key) => actionChoices[key] === true
        )?.length as number)
      : 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT] = (
      bilan / 1000
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT] = (
      transport / 1000
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT] = (
      alimentation / 1000
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT] = (
      logement / 1000
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT] = (
      divers / 1000
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT] = (
      serviceSocietaux / 1000
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
  }

  return attributesUpdated
}
