import {
  ATTRIBUTE_ACTIONS_SELECTED_NUMBER,
  ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_DATE,
  ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT,
  ATTRIBUTE_LAST_SIMULATION_WATER_FOOTPRINT,
  ATTRIBUTE_OPT_IN,
  ATTRIBUTE_PRENOM,
  ATTRIBUTE_USER_ID,
} from '../../constants/brevo'
import type { SimulationType } from '../../schemas/SimulationSchema'
import type { Attributes } from '../../types/types'

type Props = {
  name?: string
  userId?: string
  optin?: boolean
  simulation?: SimulationType
  otherAttributes?: Attributes
}

const NUMBER_OF_DAYS_IN_A_YEAR = 365

const NUMBER_OF_KG_IN_A_TON = 1000

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
    const actionChoices = simulation.actionChoices ?? {}

    const bilan = simulation.computedResults?.carbone?.bilan ?? 0
    const transport =
      simulation.computedResults?.carbone?.categories?.transport ?? 0
    const alimentation =
      simulation.computedResults?.carbone?.categories?.alimentation ?? 0
    const logement =
      simulation.computedResults?.carbone?.categories?.logement ?? 0
    const divers = simulation.computedResults?.carbone?.categories?.divers ?? 0
    const serviceSocietaux =
      simulation.computedResults?.carbone?.categories?.['services sociétaux'] ??
      0
    const water = simulation.computedResults?.eau?.bilan ?? 0

    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_DATE] = new Date().toISOString()
    attributesUpdated[ATTRIBUTE_ACTIONS_SELECTED_NUMBER] = actionChoices
      ? (Object.keys(actionChoices)?.filter(
          (key) => actionChoices[key] === true
        )?.length as number)
      : 0
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT] = (
      bilan / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT] = (
      transport / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT] = (
      alimentation / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT] = (
      logement / NUMBER_OF_KG_IN_A_TON
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT] = (
      divers / NUMBER_OF_KG_IN_A_TON
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT] = (
      serviceSocietaux / NUMBER_OF_KG_IN_A_TON
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })

    // Add the water footprint
    attributesUpdated[ATTRIBUTE_LAST_SIMULATION_WATER_FOOTPRINT] = Math.round(
      water / NUMBER_OF_DAYS_IN_A_YEAR
    ).toString()
  }

  return attributesUpdated
}
