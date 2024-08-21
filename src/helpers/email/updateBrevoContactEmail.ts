import axios from 'axios'
import { axiosConf } from '../../constants/axios'

type Props = {
  email: string
  emailModified: string
}

export async function updateBrevoContactEmail({ email, emailModified }: Props) {
  if (!email || !emailModified) {
    return
  }

  return axios.put(
    `/v3/contacts/${email}`,
    {
      email: emailModified,
    },
    axiosConf
  )
}
