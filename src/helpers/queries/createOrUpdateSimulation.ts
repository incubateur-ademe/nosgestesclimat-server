import { Simulation, SimulationType } from '../../schemas/SimulationSchema'

export async function createOrUpdateSimulation({
  id,
  user,
  actionChoices,
  date,
  foldedSteps,
  situation,
  computedResults,
  progression,
  poll,
  group,
  defaultAdditionalQuestionsAnswers,
}: SimulationType) {
  // Check if the simulation already exists
  const simulationFound = await Simulation.findOne({
    id,
    user,
  })

  // If the simulation exists, update it
  if (simulationFound) {
    simulationFound.actionChoices = actionChoices
    simulationFound.foldedSteps = foldedSteps
    simulationFound.situation = situation
    simulationFound.computedResults = computedResults
    simulationFound.progression = progression
    simulationFound.poll = poll
    simulationFound.group = group
    simulationFound.defaultAdditionalQuestionsAnswers =
      defaultAdditionalQuestionsAnswers

    await simulationFound.save()

    console.log(`Simulation ${id} updated.`)

    return simulationFound
  }

  // If the simulation does not exist, create it
  const simulationCreated = new Simulation({
    id,
    user,
    actionChoices,
    date,
    foldedSteps,
    situation,
    computedResults,
    progression,
    poll,
    group,
    defaultAdditionalQuestionsAnswers,
  })
  const simulationSaved = await simulationCreated.save()

  console.log(`Simulation ${id} created.`)

  return simulationSaved
}
