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
