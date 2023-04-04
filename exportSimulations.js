const connectdb = require('./database')
const Simulation = require('./SimulationSchema')
const fs = require('fs')

connectdb.then((db) => {
  let request = Simulation.find()
  request.then((simulations) => {
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
    fs.writeFileSync(
      `./export/simulations-${date}.json`,
      JSON.stringify(simulations)
    )
    toCSV(simulations).then((content) =>
      fs.writeFileSync('./export/simulations.csv', content)
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
    console.log(list)
    console.log('will fetch rules')
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
    console.log(csv)
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
