import { sendVerificationCodeEmail as sendBrevoVerificationCodeEmail } from '../../adapters/brevo/client'
import { Attributes, ListIds } from '../../adapters/brevo/constant'
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
      listIds: [ListIds.ORGANISATIONS],
      otherAttributes: {
        [Attributes.IS_ORGANISATION_ADMIN]: true,
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
