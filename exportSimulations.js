const connectdb = require('./database')
const Simulation = require('./SimulationSchema')
const fs = require('fs')

connectdb.then((db) => {
  let request = Simulation.find()
  request.then((simulations) => {
    fs.writeFileSync('./export/simulations.json', JSON.stringify(simulations))
    db.disconnect()
    return console.log('Fichier écrit')
  })
})
