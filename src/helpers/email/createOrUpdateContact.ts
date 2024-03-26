import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { UserType } from '../../schemas/UserSchema'
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
import { handleAddAttributes } from '../brevo/handleAddAttributes'

type Props = {
  email: string
  name?: string
  userId?: string
  listIds?: number[]
  optin?: boolean
  otherAttributes?: Record<string, string | boolean | number>
  simulation?: SimulationType
}

type Attributes = {
  [ATTRIBUTE_USER_ID]?: string
  [ATTRIBUTE_PRENOM]?: string
  [ATTRIBUTE_OPT_IN]?: boolean
} & Record<string, string | boolean | number>

export function createOrUpdateContact({
  email,
  name,
  userId,
  listIds,
  optin,
  otherAttributes = {},
  simulation,
}: Props) {
  const attributes: Attributes = {
    ...otherAttributes,
  }

  const attributesUpdated = handleAddAttributes({
    attributes,
    name,
    userId,
    optin,
    simulation,
  })

  return axios.post(
    'https://api.brevo.com/v3/contacts',
    {
      email,
      listIds,
      attributes: attributesUpdated,
      updateEnabled: true,
    },
    axiosConf
  )
}
