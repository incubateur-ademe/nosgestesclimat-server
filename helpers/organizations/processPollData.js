const Engine = require('publicodes')

function processPollData({ poll, filters, rules }) {
  const { simulations } = poll

  // 1 - We filter the simulations based on the filters

  const engine = new Engine(rules)

  return {
    numberSimulations: simulations.length,
    averageCarbonFootprint,
    averageCarbonFootprintPerCategory,
    funFacts: {
      percentageOfBicycleUsers,
      percentageOfVegetarians,
      percentageOfCarOwners,
    },
  }
}

module.exports = processPollData
