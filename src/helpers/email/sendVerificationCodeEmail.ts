import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { LIST_ID_ORGANISATIONS } from '../../constants/brevo'
import { TEMPLATE_ID_VERIFICATION_CODE } from './../../constants/brevo'
import { createOrUpdateContact } from './createOrUpdateContact'

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
      '/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId: TEMPLATE_ID_VERIFICATION_CODE,
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
