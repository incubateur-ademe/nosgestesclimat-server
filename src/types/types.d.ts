/* eslint-disable @typescript-eslint/no-unsafe-function-type */
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

export type LeanInferSchemaType<T> = InferSchemaType<T> & {
  _id: Types.ObjectId
}

type ValueToDto<T> = T extends Types.ObjectId
  ? string
  : T extends Function
    ? never
    : T extends Date
      ? string
      : T extends Map<infer Key, infer Value>
        ? Record<Key, ModelToDto<Value>>
        : T extends object
          ? ModelToDto<T>
          : T

export type ModelToDto<T> = {
  [key in keyof T]: ValueToDto<T[key]>
}
