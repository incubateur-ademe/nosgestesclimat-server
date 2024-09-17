import z from 'zod'

export enum OrganisationTypeEnum {
  association = 'association',
  company = 'company',
  cooperative = 'cooperative',
  groupOfFriends = 'groupOfFriends',
  other = 'other',
  publicOrRegionalAuthority = 'publicOrRegionalAuthority',
  universityOrSchool = 'universityOrSchool',
}

const OrganisationType = z.enum([
  OrganisationTypeEnum.association,
  OrganisationTypeEnum.company,
  OrganisationTypeEnum.cooperative,
  OrganisationTypeEnum.groupOfFriends,
  OrganisationTypeEnum.other,
  OrganisationTypeEnum.publicOrRegionalAuthority,
  OrganisationTypeEnum.universityOrSchool,
])

const OrganisationCreateAdministrator = z
  .object({
    name: z.string().optional(),
    telephone: z.string().optional(),
    position: z.string().optional(),
    optedInForCommunications: z.boolean().optional(),
  })
  .strict()

export type OrganisationCreateAdministrator = z.infer<
  typeof OrganisationCreateAdministrator
>

export const OrganisationCreateDto = z
  .object({
    name: z.string().min(1).max(100),
    type: OrganisationType,
    administrators: z.tuple([OrganisationCreateAdministrator]).optional(),
    numberOfCollaborators: z.number().optional(),
  })
  .strict()

export type OrganisationCreateDto = z.infer<typeof OrganisationCreateDto>

export const OrganisationCreateValidator = {
  body: OrganisationCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
