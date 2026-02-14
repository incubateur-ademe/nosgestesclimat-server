import { Prisma } from '@prisma/client'
import Engine, { utils } from 'publicodes'
import { disabledLogger } from '@publicodes/tools'
import type { NGCRule } from '@incubateur-ademe/nosgestesclimat'
import logger from '../src/logger.js'
import type {
  ExtendedSituationSchema,
  SituationSchema,
} from '../src/features/simulations/simulations.validator.js'
import { defaultSimulationSelection } from '../src/adapters/prisma/selection.js'
import { prisma } from '../src/adapters/prisma/client.js'

const MODEL_REGEX = /^([A-Z]{2})-([a-z]{2})-(\d+\.\d+\.\d+)$/

const parseModel = ({ model }: { model: string }) => {
  const match = model.match(MODEL_REGEX)
  if (!match) {
    throw new Error(`Invalid model format: ${model}`)
  }
  const [, region, lang, version] = match
  return { region, lang, version }
}

const rulesMap = new Map<string, Map<string, Record<string, NGCRule>>>()
const initialExtendedSituationMap = new Map<string, ExtendedSituationSchema>()

const migrateSimulation = ({
  model,
  situation,
  foldedSteps,
}: {
  model: string
  situation: SituationSchema
  foldedSteps: string[]
}) => {
  try {
    // instantiate engine according to simulation model version
    const { lang, region, version } = parseModel({ model })

    const rules = rulesMap.get(version)!.get(`${lang}-${region}`)!

    console.log(`Migrating simulation for model ${model}`)

    const engine = new Engine(rules, {
      logger: disabledLogger,
      strict: { situation: false },
    })

    // Initiate engine
    engine.setSituation(situation, {
      keepPreviousSituation: false,
    })

    const mosaicQuestionRulesWithChildren = Object.entries(rules).reduce(
      (acc, [dottedName, rule]) => {
        if (!rule) {
          return acc
        }

        if (
          Object.keys(rule).includes('question') &&
          Object.keys(rule).includes('mosaique')
        ) {
          acc[dottedName] =
            rule.mosaique?.options.map((option: string) =>
              utils.disambiguateReference(
                engine?.getParsedRules(),
                dottedName,
                option
              )
            ) || []
        }
        return acc
      },
      {} as Record<string, string[]>
    )

    // Evaluate extended situation
    const extendedSituation = Object.keys(
      initialExtendedSituationMap.get(version)!
    ).reduce((acc: ExtendedSituationSchema, key: string) => {
      acc[key] = { source: 'omitted' }
      // The dottedname is present in the simulation's situation
      if (key in situation) {
        acc[key] = {
          source: 'answered',
          nodeValue: situation[key],
        }
      } else if (foldedSteps.includes(key)) {
        acc[key] = {
          source: 'default',
          nodeValue:
            engine.evaluate(key).nodeValue === null ||
            engine.evaluate(key).nodeValue === undefined
              ? 'non défini'
              : engine.evaluate(key).nodeValue!,
        }
      } else if (
        Object.values(mosaicQuestionRulesWithChildren).flat().includes(key)
      ) {
        const isMosaicParentInFoldedSteps = Object.entries(
          mosaicQuestionRulesWithChildren
        ).some(([parentDottedName, childrenDottedNames]) => {
          return (
            childrenDottedNames.includes(key) &&
            foldedSteps.includes(parentDottedName)
          )
        })

        if (isMosaicParentInFoldedSteps) {
          acc[key] = {
            source: 'default',
            nodeValue:
              engine.evaluate(key).nodeValue === null ||
              engine.evaluate(key).nodeValue === undefined
                ? 'non défini'
                : engine.evaluate(key).nodeValue!,
          }
        }
      }
      return acc
    }, {} as ExtendedSituationSchema)
    return { extendedSituation }
  } catch (e) {
    console.log(e)
    return {
      extendedSituation: Prisma.JsonNull,
    }
  }
}

export async function getFileFromPreviousRelease(
  version: string,
  fileName: string
): Promise<Record<string, NGCRule> | ExtendedSituationSchema | null> {
  const pkg = '@incubateur-ademe/nosgestesclimat'

  const url = `https://unpkg.com/${pkg}@${version}/public/${fileName}`

  const response = await fetch(url)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(
      `Failed to fetch ${fileName} from ${pkg} version ${version}: ${response.status} ${response.statusText}`
    )
  }

  if (fileName.endsWith('.json')) {
    const data = (await response.json()) as
      | Record<string, NGCRule>
      | ExtendedSituationSchema
    return data
  }

  throw new Error(`Unsupported file type for ${fileName}`)
}

export function generateInitialExtendedSituation(
  rules: Record<string, NGCRule>
) {
  const questionDottedNames = Object.keys(rules).filter((dottedName) => {
    // In case of empty rule
    if (!rules[dottedName]) {
      return false
    }
    // A bit hacky, but we want to exclude imported questions from futureco-data
    if (dottedName.startsWith('futureco-data')) {
      return false
    }

    // We want to exclude questions that are part of a "mosaique" as a mosaique question can't be an publicodes situation entry : it gathers multiple model questions.
    return (
      Object.keys(rules[dottedName]).includes('question') &&
      !Object.keys(rules[dottedName]).includes('mosaique')
    )
  })
  return questionDottedNames.reduce((acc, dottedName) => {
    acc[dottedName] = {
      source: 'omitted',
    }
    return acc
  }, {} as ExtendedSituationSchema)
}

const main = async () => {
  try {
    // Get all distinct models
    const models = await prisma.simulation.findMany({
      where: {
        model: { not: 'FR-fr-0.0.0' },
      },
      distinct: ['model'],
      select: {
        model: true,
      },
    })

    const parsedModels = models.map(parseModel)

    // Download all npm packages for each model and populate rulesMap and initialExtendedSituationMap
    for (const { lang, region, version } of parsedModels) {
      logger.info(`Downloading package for model ${lang}-${region}-${version}`)
      if (version === '4.0.0') {
        const rules = await getFileFromPreviousRelease(
          version,
          `co2-model.${region}-lang.${lang}.json`
        )
        if (!rulesMap.has(version)) {
          rulesMap.set(version, new Map())
        }
        rulesMap
          .get(version)!
          .set(`${lang}-${region}`, rules as Record<string, NGCRule>)

        // Generate initialExtendedSituation.json if not present in the package
        const initialExtendedSituation = await getFileFromPreviousRelease(
          version,
          'initialExtendedSituation.json'
        )

        if (!initialExtendedSituation) {
          const generatedInitialExtendedSituation =
            generateInitialExtendedSituation(rules as Record<string, NGCRule>)
          initialExtendedSituationMap.set(
            version,
            generatedInitialExtendedSituation
          )
        } else {
          initialExtendedSituationMap.set(
            version,
            initialExtendedSituation as ExtendedSituationSchema
          )
        }
      }
    }

    const batchSimulations = await prisma.simulation.findMany({
      where: {
        model: { in: ['FR-fr-4.0.0'] },
      },
      select: {
        ...defaultSimulationSelection,
        extendedSituation: true,
      },
    })

    let updatedSimulations = 0

    for await (const simulation of batchSimulations) {
      const data = migrateSimulation(
        simulation as {
          model: string
          situation: SituationSchema
          foldedSteps: string[]
        }
      )

      if (!simulation.extendedSituation) {
        console.log('Updating simulation', simulation.id)
        // await prisma.simulation.update({
        //   where: { id: simulation.id },
        //   data,
        // })
      } else {
        console.log(
          'Extended situation already exists for simulation',
          simulation.id
        )
        // For model versions >= 4.0.0, we want to delete Ameublement and Electromenager mosaic children from extendedSituation

        const { version } = parseModel({ model: simulation.model })

        const filteredExtendedSituation = JSON.parse(
          JSON.stringify(simulation.extendedSituation)
        ) as ExtendedSituationSchema

        if (version.startsWith('4.')) {
          Object.keys(filteredExtendedSituation).forEach((key) => {
            if (
              key.startsWith('divers . ameublement . meubles . ') ||
              key.startsWith('divers . électroménager . appareils .')
            ) {
              filteredExtendedSituation[key] = { source: 'omitted' }
            }
          })
        }

        // Compare deeply simulation.extendedSituation and data.extendedSituation
        const existing = JSON.stringify(filteredExtendedSituation)
        const migrated = JSON.stringify(data.extendedSituation)
        if (existing !== migrated) {
          console.log(
            'Extended situation differs for simulation',
            simulation.id
          )
          // Get diff between existing and migrated
          const existingObj = JSON.parse(existing)
          const migratedObj = JSON.parse(migrated)
          const allKeys = new Set([
            ...Object.keys(existingObj),
            ...Object.keys(migratedObj),
          ])
          for (const key of allKeys) {
            if (
              JSON.stringify(existingObj[key]) !==
              JSON.stringify(migratedObj[key])
            ) {
              console.log(` - Difference at key: ${key}`)
              console.log(`   Existing: ${JSON.stringify(existingObj[key])}`)
              console.log(`   Migrated: ${JSON.stringify(migratedObj[key])}`)
            }
          }
        }
      }

      updatedSimulations++

      if (updatedSimulations % 1000 === 0) {
        logger.info('Updated simulations', { updatedSimulations })
      }
    }

    logger.info('Updated simulations', { updatedSimulations })
    process.exit(0)
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}

main()
