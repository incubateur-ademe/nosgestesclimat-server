import type { ValueOf } from '../../types/types.js'

export const Locales = {
  en: 'en',
  es: 'es',
  fr: 'fr',
} as const

export type Locales = ValueOf<typeof Locales>
