import type { NodeValue } from '@incubateur-ademe/nosgestesclimat'
import type { Document, InferSchemaType, Types } from 'mongoose'
import type { CustomAdditionalQuestionType } from '../schemas/PollSchema'

export type PollPublicInfo = {
  name?: string
  slug: string
  defaultAdditionalQuestions?: string[]
  customAdditionalQuestions?: CustomAdditionalQuestionType[]
  expectedNumberOfParticipants?: number
  numberOfParticipants: number
  organisationInfo?: OrganisationInfo
  startDate?: string
  endDate?: string
}

type OrganisationInfo = {
  name?: string
  slug?: string
}

export type Attributes = {
  [ATTRIBUTE_USER_ID]?: string
  [ATTRIBUTE_PRENOM]?: string
  [ATTRIBUTE_OPT_IN]?: boolean
} & Record<string, string | boolean | number | undefined>

export type Situation = {
  [key: string]: NodeValue
}

type WithRequiredProperty<Type, Keys extends keyof Type> = Type & {
  [Property in Keys]-?: Type[Property]
}

export type FullInferSchemaType<T> = InferSchemaType<T> &
  WithRequiredProperty<Document<Types.ObjectId>, '_id'>
