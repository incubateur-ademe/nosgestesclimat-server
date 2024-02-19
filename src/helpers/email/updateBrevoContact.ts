import axios from 'axios'
import { config } from '../../config'

type Props = {
  email: string
  hasOptedInForCommunications: boolean
  name: string
}

export async function updateBrevoContact({
  email,
  hasOptedInForCommunications,
  name,
}: Props) {
  const axiosConf = {
    headers: {
      'api-key': config.thirdParty.brevo.apiKey,
    },
  }

  // Update contact
  try {
    await axios.put(
      `https://api.brevo.com/v3/contacts/${encodeURI(email)}`,
      {
        attributes: {
          OPT_IN: hasOptedInForCommunications,
          PRENOM: name,
        },
      },
      axiosConf
    )
  } catch (error) {
    throw new Error(error)
  }
}
