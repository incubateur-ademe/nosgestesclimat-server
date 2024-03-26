import axios from 'axios'
import { axiosConf } from '../../constants/axios'
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

export function createOrUpdateContact({
  email,
  name,
  userId,
  listIds,
  optin,
  otherAttributes = {},
  simulation,
}: Props) {
  const attributesUpdated = handleAddAttributes({
    name,
    userId,
    optin,
    simulation,
    otherAttributes,
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
