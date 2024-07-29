import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { createOrUpdateContact } from './createOrUpdateContact'

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
  try {
    await createOrUpdateContact({
      email,
      otherAttributes: attributes,
    })

    await axios.post(
      '/v3/smtp/email',
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
