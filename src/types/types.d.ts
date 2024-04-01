export type PollPublicInfo = {
  name: string
  slug: string
  defaultAdditionalQuestions?: string[]
  expectedNumberOfParticipants?: number
  numberOfParticipants: number
  organisationInfo?: OrganisationInfo
  startDate?: string
  endDate?: string
}

type OrganisationInfo = {
  name: string
  slug: string
}

export type Attributes = {
  [ATTRIBUTE_USER_ID]?: string
  [ATTRIBUTE_PRENOM]?: string
  [ATTRIBUTE_OPT_IN]?: boolean
} & Record<string, string | boolean | number>
