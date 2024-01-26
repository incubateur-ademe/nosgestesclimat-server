import axios from 'axios'

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
      'api-key': process.env.BREVO_API_KEY,
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
