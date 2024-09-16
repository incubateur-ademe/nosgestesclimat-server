import { sendVerificationCodeEmail as sendBrevoVerificationCodeEmail } from '../../adapters/brevo/client'
import { LIST_ID_ORGANISATIONS } from '../../constants/brevo'
import { createOrUpdateContact } from './createOrUpdateContact'

type Props = {
  email: string
  verificationCode: string
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

    await sendBrevoVerificationCodeEmail({
      code: verificationCode.toString(),
      email,
    })
  } catch (error) {
    console.warn('Error sending email: ', error)
  }
}
