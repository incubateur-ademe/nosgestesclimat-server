/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { NodeValue } from '@incubateur-ademe/nosgestesclimat'
import type { CustomAdditionalQuestionType } from '../schemas/PollSchema'

declare global {
  namespace Express {
    export interface Request {
      user?: { userId: string; email: string }
      apiUser?: { scopes: Set<string>; email: string }
    }
  }
}

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

export type Situation = {
  [key: string]: NodeValue
}

type WithRequiredProperty<Type, Keys extends keyof Type> = Type & {
  [Property in Keys]-?: Type[Property]
}

type ValueToDto<T> = T extends Function
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

export type Metric = 'carbone' | 'eau'

export type ValueOf<T> = T[keyof T]
