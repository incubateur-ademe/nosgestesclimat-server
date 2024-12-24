import { faker } from '@faker-js/faker'
import {
  ApiScopeName,
  type IntegrationApiScope,
  type IntegrationWhitelist,
  type PrismaClient,
} from '@prisma/client'

export const createIntegrationEmailWhitelist = ({
  prisma,
  apiScope = {},
  integrationWhitelist = {},
}: {
  apiScope?: Partial<IntegrationApiScope>
  integrationWhitelist?: Partial<
    Pick<IntegrationWhitelist, 'emailPattern' | 'description'>
  >
  prisma: PrismaClient
}) => {
  const apiScopeData = {
    name: ApiScopeName.ngc,
    description: 'Scope for test',
    ...apiScope,
  }

  const integrationEmailWhitelistData = {
    emailPattern: faker.internet.email().toLocaleLowerCase(),
    description: 'Pattern for test',
    ...integrationWhitelist,
  }

  return prisma.integrationWhitelist.create({
    data: {
      ...integrationEmailWhitelistData,
      apiScope: {
        create: {
          ...apiScopeData,
        },
      },
    },
    select: {
      emailPattern: true,
      description: true,
      apiScope: {
        select: {
          name: true,
          description: true,
        },
      },
    },
  })
}
