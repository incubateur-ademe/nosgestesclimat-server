import { ApiScopeName } from '@prisma/client'

const apiScopeNames = Object.values(ApiScopeName)

export const randomApiScopeName = (scopes = apiScopeNames) =>
  scopes[Math.floor(Math.random() * scopes.length)]
