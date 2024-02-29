import axios from 'axios'
import { config } from '../../config'
import { GroupType } from '../../schemas/GroupSchema'

/**
 * Send an email to a user when they join a group or when a group is created (based on the isCreation parameter)
 */

const TEMPLATE_ID_GROUP_CREATED = 57
const TEMPLATE_ID_GROUP_JOINED = 58

type Props = {
  userDocument: Document<UserType> & UserType
  simulationSaved: Document<SimulationType> & SimulationType
  origin: string
}
export async function sendSimulationEmail({
  userDocument,
  simulationSaved,
  origin,
}: Props) {
  const { email, name } = userDocument
  // If no email is provided, we don't do anything
  if (!email) {
    return
  }

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
      templateId: isCreation
        ? TEMPLATE_ID_GROUP_CREATED
        : TEMPLATE_ID_GROUP_JOINED,
      params: {
        GROUP_URL: `${origin}/amis/resultats?groupId=${group?._id}&mtm_campaign=voir-mon-groupe-email`,
        SHARE_URL: `${origin}/amis/invitation?groupId=${group?._id}&mtm_campaign=invitation-groupe-email`,
        DELETE_URL: `${origin}/amis/supprimer?groupId=${group?._id}&userId=${userId}&mtm_campaign=invitation-groupe-email`,
        GROUP_NAME: group.name,
        NAME: name,
      },
    },
    axiosConf
  )

  console.log(`Email group ${isCreation ? 'creation' : ''} sent to ${email}`)
}
