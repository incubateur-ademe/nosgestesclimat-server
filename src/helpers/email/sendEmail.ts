import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { validateEmail } from '../../utils/validation/validateEmail'

type Props = {
  email: string
  templateId: number
  params: {
    [key: string]: string
  }
  attributes?: {
    [key: string]: string
  }
}

export async function sendEmail({
  email,
  params,
  attributes,
  templateId,
}: Props) {
  if (!validateEmail(email)) {
    console.log('Invalid email', email)
    return
  }

  // Add contact to list
  try {
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        attributes,
      },
      axiosConf
    )
  } catch (error) {
    // Do nothing, the contact already exists
  }

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId,
        params,
      },
      axiosConf
    )
  } catch (error) {
    throw new Error(error)
  }
}
