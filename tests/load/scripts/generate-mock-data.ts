import { faker } from '@faker-js/faker'

export function generateSignupData(requestParams, ctx, ee, next) {
  ctx.vars.id = faker.string.uuid()
  ctx.vars.password = faker.internet.password(10)

  return next()
}
