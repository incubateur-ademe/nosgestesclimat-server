import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { SimulationType } from '../../schemas/SimulationSchema'
import { handleAddAttributes } from '../brevo/handleAddAttributes'
import { validateEmail } from '../../utils/validation/validateEmail'

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
  if (!email) {
    return
  }

  const attributes = handleAddAttributes({
    name,
    userId,
    optin,
    simulation,
    otherAttributes,
  })

  if (!validateEmail(email)) {
    console.log('Invalid email', email)
    return
  }

  return axios.post(
    'https://api.brevo.com/v3/contacts',
    {
      email,
      listIds,
      attributes,
      updateEnabled: true,
    },
    axiosConf
  )
}
