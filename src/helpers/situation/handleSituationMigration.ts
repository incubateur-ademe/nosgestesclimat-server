import { NodeValue, DottedName } from '@incubateur-ademe/nosgestesclimat'
import { Situation } from '../../types/types'
import { SimulationType } from '../../schemas/SimulationSchema'
import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'

const keysMissing = {
  'alimentation . boisson . eau en bouteille . affirmatif': '',
  'divers . autres produits . montant': '',
  'transport . voiture . âge': '',
  'logement . chauffage . bois . type . bûche . consommation . saisie': '',
  'transport . boulot . jours télétravaillés':
    'transport . boulot . télétravail . jours télétravaillés',
  'transport . voiture . aide km': '',
  'transport . deux roues thermique . usager':
    'transport . deux roues . usager',
  'transport . vélo . km': '',
  "alimentation . déchets . niveau d'engagement":
    'alimentation . déchets . quantité jetée',
  'alimentation . lait . type': 'alimentation . type de lait',
  'transport . voiture . ratio voyageurs': '',
}

const valuesMissing = {
  'alimentation . déchets . quantité jetée': {
    'en partie': 'reduction',
  },
}

function handleMigrationKey({
  ruleName,
  nodeValue,
  situation,
  foldedSteps,
}: {
  ruleName: DottedName
  nodeValue: NodeValue
  situation: Situation
  foldedSteps: DottedName[]
}) {
  const migrationInstructions = JSON.parse(
    JSON.stringify(migrationInstructionsJSON)
  )

  migrationInstructions.keysToMigrate = {
    ...migrationInstructions.keysToMigrate,
    ...keysMissing,
  }

  // The key is not a key to migrate but a key to delete
  if (migrationInstructions.keysToMigrate[ruleName] === '') {
    delete situation[ruleName]
    const index = foldedSteps?.indexOf(ruleName)

    if (index > -1) {
      foldedSteps.splice(index, 1)
    }
    return
  }

  if (!migrationInstructions.keysToMigrate[ruleName]) {
    return
  }

  // The key is renamed and needs to be migrated
  situation[migrationInstructions.keysToMigrate[ruleName]] =
    (nodeValue as any)?.valeur ?? nodeValue

  delete situation[ruleName]
  const index = foldedSteps?.indexOf(ruleName)

  if (index > -1) {
    foldedSteps[index] = migrationInstructions.keysToMigrate[ruleName]
  }
}

function handleMigrationValue({
  ruleName,
  nodeValue,
  situation,
  foldedSteps,
}: {
  ruleName: DottedName
  nodeValue: NodeValue
  situation: Situation
  foldedSteps: DottedName[]
}) {
  const migrationInstructions = JSON.parse(
    JSON.stringify(migrationInstructionsJSON)
  )

  migrationInstructions.keysToMigrate = {
    ...migrationInstructions.keysToMigrate,
    ...keysMissing,
  }

  migrationInstructions.valuesToMigrate = {
    ...migrationInstructions.valuesToMigrate,
    ...valuesMissing,
  }

  if (!migrationInstructions.valuesToMigrate[ruleName]) {
    return
  }

  // The value is not a value to migrate and the key has to be deleted
  if (
    migrationInstructions.valuesToMigrate[ruleName][nodeValue as string] === ''
  ) {
    delete situation[ruleName]
    const index = foldedSteps?.indexOf(ruleName)

    if (index > -1) {
      foldedSteps?.splice(index, 1)
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
          ?.valeur !== undefined
      ? migrationInstructions.valuesToMigrate[ruleName][nodeValue as string]
          ?.valeur
      : migrationInstructions.valuesToMigrate[ruleName][nodeValue as string]
}

type Props = {
  simulation: SimulationType
}
export function handleSituationMigration({
  simulation,
}: Props): SimulationType {
  const migrationInstructions = JSON.parse(
    JSON.stringify(migrationInstructionsJSON)
  )

  migrationInstructions.keysToMigrate = {
    ...migrationInstructions.keysToMigrate,
    ...keysMissing,
  }

  const situation = simulation.situation
  const foldedSteps = simulation.foldedSteps

  Object.entries(situation).map(([ruleName, nodeValue]) => {
    // Handle migration of old value format : an object { valeur: number, unité: string }
    // Special case, number store as a string, we have to convert it to a number
    if (
      nodeValue &&
      typeof nodeValue === 'string' &&
      !isNaN(parseFloat(nodeValue))
    ) {
      situation[ruleName] = parseFloat(nodeValue)
    }
    // Special case : wrong value format
    if (nodeValue && nodeValue.valeur !== undefined) {
      situation[ruleName] =
        typeof nodeValue.valeur === 'string' &&
        !isNaN(parseFloat(nodeValue.valeur))
          ? parseFloat(nodeValue.valeur)
          : (nodeValue.valeur as number)
    }
    // Special case : other wrong value format
    if (nodeValue && nodeValue.nodeValue !== undefined) {
      situation[ruleName] =
        typeof nodeValue.nodeValue === 'string' &&
        !isNaN(parseFloat(nodeValue.nodeValue))
          ? parseFloat(nodeValue.nodeValue)
          : (nodeValue.nodeValue as number)
    }

    // We check if the non supported ruleName is a key to migrate.
    // Ex: "logement . chauffage . bois . type . bûche . consommation": "xxx" which is now ""logement . chauffage . bois . type . bûches . consommation": "xxx"
    if (Object.keys(migrationInstructions.keysToMigrate).includes(ruleName)) {
      handleMigrationKey({
        ruleName,
        nodeValue,
        situation,
        foldedSteps,
      })
    }

    const matchingValueToMigrateObject =
      migrationInstructions.valuesToMigrate[
        Object.keys(migrationInstructions.valuesToMigrate).find((key) =>
          ruleName.includes(key)
        ) as any
      ]

    const formattedNodeValue =
      typeof nodeValue === 'string' &&
      nodeValue.startsWith("'") &&
      nodeValue !== 'oui' &&
      nodeValue !== 'non'
        ? nodeValue.slice(1, -1)
        : (nodeValue as string)

    if (
      // We check if the value of the non supported ruleName value is a value to migrate.
      // Ex: answer "logement . chauffage . bois . type": "bûche" changed to "bûches"
      // If a value is specified but empty, we consider it to be deleted (we need to ask the question again)
      // Ex: answer "transport . boulot . commun . type": "vélo"
      matchingValueToMigrateObject &&
      Object.keys(matchingValueToMigrateObject).includes(
        // If the string start with a ', we remove it along with the last character
        // Ex: "'bûche'" => "bûche"
        formattedNodeValue
      )
    ) {
      handleMigrationValue({
        ruleName,
        nodeValue: formattedNodeValue,
        situation,
        foldedSteps,
      })
    }
  })

  return simulation
}
