import {
  transaction,
  type Session,
} from '../../../../adapters/prisma/transaction'

export const findIntegrationWhitelist = (
  { emailDomain }: { emailDomain: string },
  { session }: { session?: Session } = {}
) => {
  return transaction(
    async (prismaSession) =>
      prismaSession.integrationWhitelist.findMany({
        where: {
          emailPattern: {
            endsWith: `@${emailDomain}`,
          },
        },
        select: {
          emailPattern: true,
          apiScopeName: true,
        },
      }),
    session
  )
}
