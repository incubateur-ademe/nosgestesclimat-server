/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DottedName } from '@incubateur-ademe/nosgestesclimat'
import fs from 'fs'
import connectdb from '../src/helpers/db/initDatabase'
import type { SimulationType } from '../src/schemas/SimulationSchema'
import { Simulation } from '../src/schemas/SimulationSchema'

type SimulationWithData = SimulationType & {
  data: any
}

const dateFileExtension = (date: Date) =>
  date.toLocaleDateString('fr-FR').replace(/\//g, '-')
connectdb().then((db) => {
  const request = Simulation.find<SimulationWithData>()
  request.then((simulations) => {
    fs.writeFileSync(
      `./export/simulations-${dateFileExtension(new Date())}.json`,
      JSON.stringify(simulations)
    )
    toCSV(simulations).then((content) =>
      fs.writeFileSync(
        `./export/simulations-${dateFileExtension(new Date())}.csv`,
        content || 'No content'
      )
    )
    db.disconnect()
    return console.log('Fichier écrit')
  })
})

const url =
  'https://deploy-preview-1809--ecolab-data.netlify.app/co2-model.FR-lang.fr.json'
const categories = [
  'logement',
  'transport',
  'alimentation',
  'divers',
  'services sociétaux',
]

const defaultValueToken = '_defaultValue'

const toCSV = async (list: SimulationWithData[]) => {
  try {
    const response = await fetch(url)
    if (!response.ok) console.log('Oups')
    const rules = (await response.json()) as Record<DottedName, any>
    console.log('got ', Object.keys(rules).length, ' rules')
    const questionRules = Object.entries(rules)
      .map(([dottedName, v]) => ({ ...v, dottedName }))
      .filter((el) => el && el.question)
    const questionDottedNames = questionRules.map((rule) => rule.dottedName)

    // We need to expose the full list of questions of the model in order to index the CSV
    // Then fill with value | 'default' | ''
    const header = [
      'userID',
      'createdAt',
      'updatedAt',
      ...categories,
      'total',
      ...questionDottedNames,
    ]

    const questionValue = (data: any, question: any) => {
      const value = data.situation[question]
      if (value == null) {
        if (data.answeredQuestions.includes(question)) return defaultValueToken
        return ''
      }
      if (value != null && !data.answeredQuestions.includes(question)) {
        // This can happen for some mosaic questions where the selection of "Aucun" triggers a value of "O" in the simulation (is it a bug ?)
        // See https://github.com/datagir/nosgestesclimat-site/issues/994
        // It can also of course happen when this is the last question of the user : he's input something, but did not validate.
        // Hence we don't consider this question answered
        return ''
      }
      if (typeof value === 'object') return value.valeur
      else return value
    }
    const newList = list
      .map(
        (simulation) =>
          isValidSimulation(simulation) && [
            simulation.id,
            dateFileExtension(simulation.createdAt), //haven't check if the hour is correct, but the day looks good
            dateFileExtension(simulation.updatedAt),
            ...categories.map(
              (category) => simulation.data.results.categories[category]
            ),
            simulation.data.results.total,
            ...questionDottedNames.map((question) =>
              questionValue(simulation.data, question)
            ),
          ]
      )
      .filter(Boolean)
    const csv = [
      separate(header),
      ...newList.map((list) => separate(list)),
    ].join('\r\n')
    return csv
  } catch (e) {
    console.log(e)
  }
}
const guillemet = '"'

const separate = (line: string[]) =>
  guillemet + line.join(`${guillemet};${guillemet}`) + guillemet

const isValidSimulation = (simulation: SimulationWithData) =>
  simulation.data && simulation.data.results && simulation.data.situation
