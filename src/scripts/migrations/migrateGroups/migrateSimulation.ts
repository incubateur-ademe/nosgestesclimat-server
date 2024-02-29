import { DottedName } from '@incubateur-ademe/nosgestesclimat'
import migrationInstructions from '@incubateur-ademe/nosgestesclimat/public/migration.json'
import { SimulationType } from '../../../schemas/SimulationSchema'
import { Evaluation } from 'publicodes'
import { unformatSituation } from '../../../utils/unformatSituation'
import { unformatDottedName } from '../../../utils/formatDottedName'

type Situation = Record<DottedName, Evaluation>

type MigrationType = {
  keysToMigrate: Record<DottedName, DottedName>
  valuesToMigrate: Record<DottedName, Record<string, Evaluation>>
}

function handleMigrationKey({
  ruleName,
  nodeValue,
  situation,
  foldedSteps,
  migrationInstructions,
}: {
  ruleName: DottedName
  nodeValue: Evaluation
  situation: Situation
  foldedSteps: DottedName[]
  migrationInstructions: MigrationType
}) {
  if (!migrationInstructions.keysToMigrate[ruleName]) {
    return
  }

  // The key is not a key to migrate but a key to delete
  // @ts-ignore
  if (migrationInstructions.keysToMigrate[ruleName] === '') {
    delete situation[ruleName]
    const index = foldedSteps.indexOf(ruleName)

    if (index > -1) {
      foldedSteps.splice(index, 1)
    }
    return
  }

  // The key is renamed and needs to be migrated
  situation[migrationInstructions.keysToMigrate[ruleName]] = nodeValue

  delete situation[ruleName]
  const index = foldedSteps.indexOf(ruleName)

  if (index > -1) {
    foldedSteps[index] = migrationInstructions.keysToMigrate[ruleName]
  }
}

function handleMigrationValue({
  ruleName,
  nodeValue,
  situation,
  foldedSteps,
  migrationInstructions,
}: {
  ruleName: DottedName
  nodeValue: Evaluation
  situation: Situation
  foldedSteps: DottedName[]
  migrationInstructions: MigrationType
}) {
  if (!migrationInstructions.valuesToMigrate[ruleName]) {
    return
  }

  // The value is not a value to migrate and the key has to be deleted
  if (
    migrationInstructions.valuesToMigrate[ruleName][nodeValue as string] === ''
  ) {
    delete situation[ruleName]
    const index = foldedSteps.indexOf(ruleName)
    if (index > -1) {
      foldedSteps.splice(index, 1)
    }
    return
  }

  // The value is renamed and needs to be migrated
  situation[ruleName] =
    typeof migrationInstructions.valuesToMigrate[ruleName][
      nodeValue as string
    ] === 'string' &&
    migrationInstructions.valuesToMigrate[ruleName][nodeValue as string] !==
      'oui' &&
    migrationInstructions.valuesToMigrate[ruleName][nodeValue as string] !==
      'non'
      ? `'${
          migrationInstructions.valuesToMigrate[ruleName][nodeValue as string]
        }'`
      : migrationInstructions.valuesToMigrate[ruleName][nodeValue as string]
}

export function migrateSimulation(simulationFromProps: SimulationType) {
  if (!simulationFromProps?.situation) {
    return simulationFromProps
  }

  const simulation = { ...simulationFromProps }
  const unsupportedDottedNamesFromSituation: DottedName[] = []

  const situation = unformatSituation(simulation.situation)
  const foldedSteps =
    simulation?.foldedSteps?.map(
      (dottedName) => unformatDottedName(dottedName) as DottedName
    ) ?? []

  if (!situation) {
    return simulation
  }

  Object.entries(situation).map(([ruleName, nodeValue]) => {
    // We check if the non supported ruleName is a key to migrate.
    // Ex: "logement . chauffage . bois . type . bûche . consommation": "xxx" which is now ""logement . chauffage . bois . type . bûches . consommation": "xxx"
    if (Object.keys(migrationInstructions.keysToMigrate).includes(ruleName)) {
      // @ts-ignore
      unsupportedDottedNamesFromSituation.push(ruleName)

      handleMigrationKey({
        // @ts-ignore
        ruleName,
        nodeValue,
        // @ts-ignore
        situation,
        // @ts-ignore
        foldedSteps,
        // @ts-ignore
        migrationInstructions,
      })
    }

    if (
      // We check if the value of the non supported ruleName value is a value to migrate.
      // Ex: answer "logement . chauffage . bois . type": "bûche" changed to "bûches"
      // If a value is specified but empty, we consider it to be deleted (we need to ask the question again)
      // Ex: answer "transport . boulot . commun . type": "vélo"
      Object.keys(migrationInstructions.valuesToMigrate).includes(ruleName) &&
      // @ts-ignore
      Object.keys(migrationInstructions.valuesToMigrate[ruleName]).includes(
        nodeValue as string
      )
    ) {
      // @ts-ignore
      unsupportedDottedNamesFromSituation.push(ruleName)

      handleMigrationValue({
        // @ts-ignore
        ruleName,
        nodeValue,
        // @ts-ignore
        situation,
        // @ts-ignore
        foldedSteps,
        // @ts-ignore
        migrationInstructions,
      })
    }
  })

  return simulation
}
