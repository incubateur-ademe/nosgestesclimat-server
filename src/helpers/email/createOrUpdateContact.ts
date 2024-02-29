import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { UserType } from '../../schemas/UserSchema'

type Props = {
  user: UserType
  listIds?: number[]
  optin?: boolean
}
export function createOrUpdateContact({ user, listIds, optin }: Props) {
  return axios.post(
    'https://api.brevo.com/v3/contacts',
    {
      email: user.email,
      listIds,
      attributes: {
        userId: user.userId,
        PRENOM: user.name,
        OPT_IN: optin,
      },
      updateEnabled: true,
    },
    axiosConf
  )
}
