import type { ApiScopeName } from '@prisma/client'
import { defaultEmailWhitelistSelection } from '../../../../adapters/prisma/selection'
import type { Session } from '../../../../adapters/prisma/transaction'
import { transaction } from '../../../../adapters/prisma/transaction'
import type {
  EmailWhitelistCreateDto,
  EmailWhitelistParams,
  EmailWhitelistsFetchQuery,
  EmailWhitelistUpdateDto,
} from './email-whitelist.contract'

const getEmailDomainName = (email: string) => {
  const [, domain] = email.split('@')
  return domain
}

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

export const updateWhitelist = (
  { whitelistId }: EmailWhitelistParams,
  { description, emailPattern, scope }: EmailWhitelistUpdateDto,
  scopes: Set<string>,
  { session }: { session?: Session } = {}
) => {
  return transaction(
    async (prismaSession) =>
      prismaSession.integrationWhitelist.update({
        where: {
          id: whitelistId,
          apiScope: {
            name: {
              in: [...scopes] as ApiScopeName[],
            },
          },
        },
        data: {
          emailPattern,
          description,
          ...(scope
            ? {
                apiScope: {
                  connect: {
                    name: scope,
                  },
                },
              }
            : {}),
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

export const fetchWhitelists = (
  {
    emailPattern,
    scopes,
  }:
    | (Required<EmailWhitelistsFetchQuery> & { scopes?: Set<string> })
    | (EmailWhitelistsFetchQuery & { scopes: Set<string> }),
  { session }: { session?: Session } = {}
) => {
  return transaction(
    (prismaSession) =>
      prismaSession.integrationWhitelist.findMany({
        where: {
          ...(scopes
            ? {
                apiScope: {
                  name: {
                    in: [...scopes] as ApiScopeName[],
                  },
                },
              }
            : {}),
          ...(emailPattern
            ? {
                OR: [
                  {
                    emailPattern,
                  },
                  ...(emailPattern === `*@${getEmailDomainName(emailPattern)}`
                    ? [
                        {
                          emailPattern: {
                            endsWith: `@${getEmailDomainName(emailPattern)}`,
                          },
                        },
                      ]
                    : [
                        {
                          emailPattern: `*@${getEmailDomainName(emailPattern)}`,
                        },
                      ]),
                ],
              }
            : {}),
        },
        select: defaultEmailWhitelistSelection,
      }),
    session
  )
}
