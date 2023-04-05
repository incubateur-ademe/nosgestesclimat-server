const connectdb = require('./database')
const Simulation = require('./SimulationSchema')
const fs = require('fs')

const dateFileExtension = () =>
  new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
connectdb.then((db) => {
  let request = Simulation.find()
  request.then((simulations) => {
    fs.writeFileSync(
      `./export/simulations-${dateFileExtension()}.json`,
      JSON.stringify(simulations)
    )
    toCSV(simulations).then((content) =>
      fs.writeFileSync(
        `./export/simulations-${dateFileExtension()}.csv`,
        content
      )
    )
    db.disconnect()
    return console.log('Fichier écrit')
  })
})

const url = 'https://data.nosgestesclimat.fr/co2-model.FR-lang.fr.json'
const categories = [
  'logement',
  'transport',
  'alimentation',
  'divers',
  'services sociétaux',
]

const toCSV = async (list) => {
  try {
    const response = await fetch(url)
    if (!response.ok) console.log('Oups')
    const rules = await response.json()
    console.log('got ', Object.keys(rules).length, ' rules')

    const questionRules = Object.entries(rules)
      .map(([dottedName, v]) => ({ ...v, dottedName }))
      .filter((el) => el && el.question)
    const questionDottedNames = questionRules.map((rule) => rule.dottedName)

    // We need to expose the full list of questions of the model in order to index the CSV
    // Then fill with value | 'default' | ''
    const header = ['userID', ...categories, 'total', ...questionDottedNames]
    const questionValue = (data, question) => {
      const value = data.situation[question]
      if (value == null) return ''
      if (value != null && !data.answeredQuestions.includes(question))
        return '_defaultValue'
      if (typeof value === 'object') return value.valeur
      else return value
    }
    const newList = list
      .map(
        (simulation) =>
          isValidSimulation(simulation) && [
            simulation.id,
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
const separate = (line) =>
  guillemet + line.join(`${guillemet};${guillemet}`) + guillemet

const isValidSimulation = (simulation) =>
  simulation.data && simulation.data.results && simulation.data.situation
