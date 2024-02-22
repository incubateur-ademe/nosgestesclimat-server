import { Document, RefType } from 'mongoose'
import { PollType } from '../../schemas/PollSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import { UserType } from '../../schemas/UserSchema'
import { Organisation } from '../../schemas/OrganisationSchema'

type Props = {
  poll: Document<PollType> & PollType
  userDocument: Document<UserType> & UserType
  simulationSaved: Document<SimulationType> & SimulationType
}

export async function handleUpdateUser({
  poll,
  userDocument,
  simulationSaved,
}: Props) {
  if (!userDocument) {
    return
  }

  // If there is no poll we do nothing
  if (!poll) {
    return
  }

  if (simulationSaved) {
    // Add simulation to user document
    userDocument.simulations?.push(simulationSaved._id as RefType)
  }

  const organisationFound = await Organisation.findOne({
    polls: poll._id,
  })

  // Add organisation to user document
  if (
    organisationFound &&
    !userDocument.organisations?.includes(organisationFound._id)
  ) {
    userDocument.organisations?.push(organisationFound._id)
  }

  await userDocument.save()
}
