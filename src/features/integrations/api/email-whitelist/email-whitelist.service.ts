import { EntityNotFoundException } from '../../../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../../../core/errors/ForbiddenException'
import { isPrismaErrorNotFound } from '../../../../core/typeguards/isPrismaError'
import type { EmailWhitelistCreateDto } from './email-whitelist.contract'
import { createWhitelist } from './email-whitelist.repository'

const whitelistToDto = ({
  apiScopeName,
  ...whitelist
}: Awaited<ReturnType<typeof createWhitelist>>) => ({
  ...whitelist,
  scope: apiScopeName,
})

export const createEmailWhitelist = async ({
  emailWhitelistDto,
  userScopes,
}: {
  emailWhitelistDto: EmailWhitelistCreateDto
  userScopes: Set<string>
}) => {
  try {
    if (!userScopes.has(emailWhitelistDto.scope)) {
      throw new ForbiddenException(
        `Unauthorized to create whitelist for ${emailWhitelistDto.scope}`
      )
    }

    const whitelist = await createWhitelist(emailWhitelistDto)

    return whitelistToDto(whitelist)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('ApiScope not found')
    }
    throw e
  }
}
