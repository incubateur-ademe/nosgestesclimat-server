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
    //fs.writeFileSync('./export/simulations.csv', JSON.stringify(simulations))
    db.disconnect()
    return console.log('Fichier écrit')
  })
})
