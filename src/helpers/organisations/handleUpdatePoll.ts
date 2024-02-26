import { Document, RefType } from 'mongoose'
import { PollType } from '../../schemas/PollSchema'
import { SimulationType } from '../../schemas/SimulationSchema'

export async function handleUpdatePoll({
  poll,
  simulationSaved,
}: {
  poll?: Document<PollType> & PollType
  simulationSaved: Document<SimulationType> & SimulationType
}) {
  if (!poll || poll.simulations.includes(simulationSaved._id as RefType)) {
    return
  }

  poll.simulations.push(simulationSaved._id as RefType)
  await poll.save()

  console.log(`Simulation saved in poll ${poll.slug}.`)
}
