import axios from 'axios'
import { config } from '../../config'

type Props = {
  email: string
  shareURL: string
  simulationURL: string
  attributes: {
    [key: string]: string
  }
}

export async function sendSavedSimulation({
  email,
  shareURL,
  simulationURL,
  attributes,
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
      templateId: 55,
      params: {
        SHARE_URL: shareURL,
        SIMULATION_URL: simulationURL,
      },
    },
    axiosConf
  )
}
