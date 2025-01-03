import type { ApiScopeName } from '@prisma/client'
import { defaultEmailWhitelistSelection } from '../../../../adapters/prisma/selection'
import type { Session } from '../../../../adapters/prisma/transaction'
import { transaction } from '../../../../adapters/prisma/transaction'
import type {
  EmailWhitelistCreateDto,
  EmailWhitelistParams,
} from './email-whitelist.contract'

export const createWhitelist = (
  { description, emailPattern, scope }: EmailWhitelistCreateDto,
  { session }: { session?: Session } = {}
) => {
  return transaction(
    async (prismaSession) =>
      prismaSession.integrationWhitelist.upsert({
        where: {
          emailPattern_apiScopeName: {
            emailPattern,
            apiScopeName: scope,
          },
        },
        create: {
          emailPattern,
          description,
          apiScope: {
            connect: {
              name: scope,
            },
          },
        },
        update: {
          description,
        },
        select: defaultEmailWhitelistSelection,
      }),
    session
  )
}

export const deleteWhitelist = (
  { whitelistId }: EmailWhitelistParams,
  scopes: Set<string>,
  { session }: { session?: Session } = {}
) => {
  return transaction(
    async (prismaSession) =>
      prismaSession.integrationWhitelist.delete({
        where: {
          id: whitelistId,
          apiScope: {
            name: {
              in: [...scopes] as ApiScopeName[],
            },
          },
        },
        select: {
          id: true,
        },
      }),
    session
  )
}
