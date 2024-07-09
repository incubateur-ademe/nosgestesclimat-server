import axios from 'axios'
import { axiosConf } from '../../constants/axios'

type Props = {
  email: string
  emailModified: string
}

export async function updateBrevoContactEmail({ email, emailModified }: Props) {
  if (!email) {
    return
  }

  return axios.put(
    `https://api.brevo.com/v3/contacts/${email}`,
    {
      email: emailModified,
    },
    axiosConf
  )
}
