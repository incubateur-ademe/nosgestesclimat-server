import { Attributes } from '../../adapters/brevo/constant'
import type { SimulationType } from '../../schemas/SimulationSchema'

type Props = {
  name?: string
  userId?: string
  optin?: boolean
  simulation?: SimulationType
  otherAttributes?: Record<string, string | boolean | number | undefined>
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
    attributesUpdated[Attributes.PRENOM] = name
  }

  if (optin !== undefined) {
    attributesUpdated[Attributes.OPT_IN] = optin
  }

  if (userId) {
    attributesUpdated[Attributes.USER_ID] = userId
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

    attributesUpdated[Attributes.LAST_SIMULATION_DATE] =
      new Date().toISOString()
    attributesUpdated[Attributes.ACTIONS_SELECTED_NUMBER] = actionChoices
      ? (Object.keys(actionChoices)?.filter(
          (key) => actionChoices[key] === true
        )?.length as number)
      : 0
    attributesUpdated[Attributes.LAST_SIMULATION_BILAN_FOOTPRINT] = (
      bilan / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[Attributes.LAST_SIMULATION_TRANSPORTS_FOOTPRINT] = (
      transport / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[Attributes.LAST_SIMULATION_ALIMENTATION_FOOTPRINT] = (
      alimentation / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[Attributes.LAST_SIMULATION_LOGEMENT_FOOTPRINT] = (
      logement / NUMBER_OF_KG_IN_A_TON
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[Attributes.LAST_SIMULATION_DIVERS_FOOTPRINT] = (
      divers / NUMBER_OF_KG_IN_A_TON
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })
    attributesUpdated[Attributes.LAST_SIMULATION_SERVICES_FOOTPRINT] = (
      serviceSocietaux / NUMBER_OF_KG_IN_A_TON
    )?.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })

    // Add the water footprint
    attributesUpdated[Attributes.LAST_SIMULATION_BILAN_WATER] = Math.round(
      water / NUMBER_OF_DAYS_IN_A_YEAR
    ).toString()
  }

  return attributesUpdated
}
