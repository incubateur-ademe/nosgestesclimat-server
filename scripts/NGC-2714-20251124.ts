import type { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import { Prisma } from '@prisma/client'
import Engine from 'publicodes'
import { prisma } from '../src/adapters/prisma/client.js'
import { defaultSimulationSelection } from '../src/adapters/prisma/selection.js'
import { batchFindMany } from '../src/core/batch-find-many.js'
import type {
  ExtendedSituationSchema,
  SituationSchema,
} from '../src/features/simulations/simulations.validator.js'
import logger from '../src/logger.js'

const MODEL_REGEX = /^([A-Z]{2})-([a-z]{2})-(\d+\.\d+\.\d+)$/

const parseModel = ({ model }: { model: string }) => {
  const match = model.match(MODEL_REGEX)
  if (!match) {
    throw new Error(`Invalid model format: ${model}`)
  }
  const [, lang, region, version] = match
  return { lang, region, version }
}

const rulesMap = new Map<string, Map<string, NGCRules>>()
const initialExtendedSituationMap = new Map<string, ExtendedSituationSchema>()

const migrateSimulation = ({
  model,
  situation,
}: {
  model: string
  situation: SituationSchema
}) => {
  try {
    // instantiate engine according to simulation model version
    const { lang, region, version } = parseModel({ model })
    const rules = rulesMap.get(version)!.get(`${lang}-${region}`)!
    const engine = new Engine(rules)

    // Initiate engine
    engine.setSituation(situation, {
      keepPreviousSituation: false,
    })
    const rawMissingVariables =
      engine?.evaluate('bilan')?.missingVariables || {}

    // Evaluate extended situation
    const extendedSituation = Object.keys(
      initialExtendedSituationMap.get(version)!
    ).reduce((acc: ExtendedSituationSchema, key) => {
      // The dottedname is present in the simulation's situation
      if (key in situation) {
        acc[key] = {
          nodeValue: engine.evaluate(key).nodeValue!,
          source: 'answered',
        }
        return acc
      } else if (
        typeof engine.evaluate({ 'est applicable': key }).nodeValue !==
          'undefined' &&
        !(key in rawMissingVariables)
      ) {
        acc[key] = {
          nodeValue:
            engine.evaluate(key).nodeValue === null ||
            engine.evaluate(key).nodeValue === undefined
              ? 'non défini'
              : engine.evaluate(key).nodeValue!,
          source: 'default',
        }
        return acc
      } else {
        acc[key] = { source: 'omitted' }
        return acc
      }
    }, {})
    return { extendedSituation }
  } catch (e) {
    console.log(e)
    return {
      extendedSituation: Prisma.JsonNull,
    }
  }
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
    parsedModels.forEach(({ lang, region, version }) => {
      logger.info(`Downloading package for model ${lang}-${region}-${version}`)
    })

    // Generate initialExtendedSituation.json if not present in the package

    const batchPollSimulations = batchFindMany((params) =>
      prisma.simulationPoll.findMany({
        ...params,
        where: {
          simulation: {
            model: { not: 'FR-fr-0.0.0' },
          },
        },
        select: {
          id: true,
          simulation: {
            select: {
              ...defaultSimulationSelection,
              extendedSituation: true,
            },
          },
        },
      })
    )

    let updatedSimulations = 0

    for await (const { simulation } of batchPollSimulations) {
      const data = migrateSimulation(
        simulation as { model: string; situation: SituationSchema }
      )

      if (!simulation.extendedSituation) {
        await prisma.simulation.update({
          where: { id: simulation.id },
          data,
        })
      } else {
        // TODO compare existing extendedSituation with data.extendedSituation
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
