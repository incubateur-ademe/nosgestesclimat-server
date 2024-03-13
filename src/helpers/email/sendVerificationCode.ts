import axios from 'axios'
import { axiosConf } from '../../constants/axios'

type Props = {
  email: string
  verificationCode: number
}

export async function sendVerificationCode({ email, verificationCode }: Props) {
  // Add contact to list
  try {
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        listIds: [27],
        attributes: {
          OPT_IN: false,
        },
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
        templateId: 66,
        params: {
          VERIFICATION_CODE: verificationCode,
        },
      },
      axiosConf
    )
  } catch (error) {
    console.log('Error sending email: ')
  }
}