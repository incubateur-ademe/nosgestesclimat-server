import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import { Document } from 'mongoose'

/**
 * Send an email to a user when they save a simulation at the end
 */

type Props = {
  userDocument: Document<UserType> & UserType
  simulationSaved: Document<SimulationType> & SimulationType
  shouldSendSimulationEmail: boolean
  origin: string
}
export async function sendSimulationEmail({
  userDocument,
  simulationSaved,
  shouldSendSimulationEmail,
  origin,
}: Props) {
  const { email, name } = userDocument
  // If no email is provided, we don't do anything
  if (!email) {
    return
  }

  // If we should not send the email, we don't do anything
  if (!shouldSendSimulationEmail) {
    return
  }

  // Add contact to list
  try {
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        name,
        attributes: {
          OPT_IN: true,
        },
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
        SHARE_URL: `${origin}?mtm_campaign=partage-email`,
        SIMULATION_URL: `${origin}/fin?sid=${encodeURIComponent(
          simulationSaved.id ?? ''
        )}&mtm_campaign=retrouver-ma-simulation`,
      },
    },
    axiosConf
  )

  console.log(`Simulation email sent to ${email}`)
}
