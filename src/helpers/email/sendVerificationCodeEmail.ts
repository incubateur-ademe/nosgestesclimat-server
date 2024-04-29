import { ATTRIBUTE_IS_ORGANISATION_ADMIN } from './../../constants/brevo'
import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { createOrUpdateContact } from './createOrUpdateContact'
import { LIST_ID_ORGANISATIONS } from '../../constants/brevo'

type Props = {
  email: string
  verificationCode: number
  userId?: string
}

export async function sendVerificationCodeEmail({
  email,
  verificationCode,
}: Props) {
  try {
    // Add contact to the list or update it
    await createOrUpdateContact({
      email,
      listIds: [LIST_ID_ORGANISATIONS],
      otherAttributes: {
        ATTRIBUTE_IS_ORGANISATION_ADMIN: true,
      },
    })

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
    console.log(error)
    console.log('Error sending email: ')
  }
}
