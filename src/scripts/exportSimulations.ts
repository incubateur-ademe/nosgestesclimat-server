import { Simulation } from './../schemas/SimulationSchema'
import connectdb from './initDatabase'
import fs from 'fs'

const dateFileExtension = (date: Date) =>
  date.toLocaleDateString('fr-FR').replace(/\//g, '-')
// @ts-ignore
connectdb.then((db) => {
  let request = Simulation.find()
  // @ts-ignore
  request.then((simulations) => {
    fs.writeFileSync(
      `./export/simulations-${dateFileExtension(new Date())}.json`,
      JSON.stringify(simulations)
    )
    toCSV(simulations).then((content) =>
      fs.writeFileSync(
        `./export/simulations-${dateFileExtension(new Date())}.csv`,
        // @ts-ignore
        content
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
// @ts-ignore
const toCSV = async (list) => {
  try {
    const response = await fetch(url)
    if (!response.ok) console.log('Oups')
    const rules = await response.json()
    // @ts-ignore
    console.log('got ', Object.keys(rules).length, ' rules')
    // @ts-ignore
    const questionRules = Object.entries(rules)
      // @ts-ignore
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
    // @ts-ignore
    const questionValue = (data, question) => {
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
        // @ts-ignore
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
      // @ts-ignore
      ...newList.map((list) => separate(list)),
    ].join('\r\n')
    return csv
  } catch (e) {
    console.log(e)
  }
}
const guillemet = '"'
// @ts-ignore
const separate = (line) =>
  guillemet + line.join(`${guillemet};${guillemet}`) + guillemet
// @ts-ignore
const isValidSimulation = (simulation) =>
  simulation.data && simulation.data.results && simulation.data.situation
