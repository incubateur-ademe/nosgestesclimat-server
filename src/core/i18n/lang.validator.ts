import { z } from 'zod'
import { Locales } from './constant.js'

export const LocaleQuery = z
  .object({
    locale: z.nativeEnum(Locales).default(Locales.fr),
  })
  .strict()
