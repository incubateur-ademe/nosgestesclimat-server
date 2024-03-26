import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { UserType } from '../../schemas/UserSchema'
import {
  ATTRIBUTE_OPT_IN,
  ATTRIBUTE_PRENOM,
  ATTRIBUTE_USER_ID,
} from '../../constants/brevo'

type Props = {
  email: string
  name?: string
  userId?: string
  listIds?: number[]
  optin?: boolean
  otherAttributes?: Record<string, string | boolean | number>
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
}: Props) {
  const attributes: Attributes = {
    ...otherAttributes,
  }

  if (name) {
    attributes[ATTRIBUTE_PRENOM] = name
  }

  if (optin !== undefined) {
    attributes[ATTRIBUTE_OPT_IN] = optin
  }

  if (userId) {
    attributes[ATTRIBUTE_USER_ID] = userId
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
