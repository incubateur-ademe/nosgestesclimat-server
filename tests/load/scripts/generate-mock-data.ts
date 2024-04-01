const faker = require('faker')

function generateSignupData(requestParams, ctx, ee, next) {
  ctx.vars.simulationId = faker.string.uuid()
  ctx.vars.date = faker.date.recent()
  ctx.vars.userId = faker.string.uuid()

  return next()
}

module.exports = {
  generateSignupData,
}
