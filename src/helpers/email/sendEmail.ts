import axios from 'axios'
import { config } from '../../config'

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
  const axiosConf = {
    headers: {
      'api-key': config.thirdParty.brevo.apiKey,
    },
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
}
