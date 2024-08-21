import type { AxiosResponse } from 'axios'
import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import type { SimulationType } from '../../schemas/SimulationSchema'
import { validateEmail } from '../../utils/validation/validateEmail'
import { handleAddAttributes } from '../brevo/handleAddAttributes'

type Props = {
  email: string
  name?: string
  userId?: string
  listIds?: number[]
  optin?: boolean
  otherAttributes?: Record<string, string | boolean | number | undefined>
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
}: Props): Promise<AxiosResponse> {
  if (!email) {
    return Promise.reject(new Error('No email provided'))
  }

  if (!validateEmail(email)) {
    return Promise.reject(new Error('Invalid email provided'))
  }

  const attributes = handleAddAttributes({
    name,
    userId,
    optin,
    simulation,
    otherAttributes,
  })

  return axios.post(
    '/v3/contacts',
    {
      email,
      listIds,
      attributes,
      updateEnabled: true,
    },
    axiosConf
  )
}
