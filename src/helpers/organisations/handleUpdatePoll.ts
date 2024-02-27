import { Document, RefType } from 'mongoose'
import { PollType } from '../../schemas/PollSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import { sendEmail } from "../email/sendEmail"
import { Organisation, OrganisationType } from "../../schemas/OrganisationSchema"

export async function handleUpdatePoll({
  poll,
  simulationSaved,
  email,
}: {
  poll?: Document<PollType> & PollType
  simulationSaved: Document<SimulationType> & SimulationType
  email: string
}) {
  if (!poll || poll.simulations.includes(simulationSaved._id as RefType)) {
    return
  }

  poll.simulations.push(simulationSaved._id as RefType)

  await poll.save()

  // Send confirmation email
  if (email) {
    const organisationFound = await Organisation.findOne({
      polls: poll._id,
    }) as Document<OrganisationType> & OrganisationType

    await sendEmail({
      email,
      templateId: 71,
      params: {
        ORGANISATION_NAME: organisationFound?.name ?? '',
        DETAILED_VIEW_URL: `https://nosgestesclimat.fr/organisations/${organisationFound?.slug}/resultats-detailles`,
      },
    })
  }

  console.log(`Simulation saved in poll ${poll.slug}.`)
}
