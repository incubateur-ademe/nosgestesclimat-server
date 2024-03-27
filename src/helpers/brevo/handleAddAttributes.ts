import { formatValue } from 'publicodes'
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

  // transform simulation?.computedResults?.bilan from kg to tons to a float with 1 decimal
  const bilan = simulation?.computedResults?.bilan

  if (simulation) {
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_DATE] = new Date().toISOString()
    attributesUpdated[ATTRIBUTE_ACTIONS_SELECTED_NUMBER] =
      (simulation?.actionChoices?.length as number) ?? 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT] =
      formatValue(simulation?.computedResults?.bilan / 1000, {
        precision: 1,
      }) ?? 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT] =
      formatValue(simulation?.computedResults?.categories?.transport / 1000, {
        precision: 1,
      }) ?? 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT] =
      formatValue(
        simulation?.computedResults?.categories?.alimentation / 1000,
        { precision: 1 }
      ) ?? 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT] =
      formatValue(simulation?.computedResults?.categories?.logement / 1000, {
        precision: 1,
      }) ?? 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT] =
      formatValue(simulation?.computedResults?.categories?.divers / 1000, {
        precision: 1,
      }) ?? 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT] =
      formatValue(
        simulation?.computedResults?.categories?.['services sociétaux'] / 1000,
        { precision: 1 }
      ) ?? 0
  }

  return attributesUpdated
}
