import { z } from 'zod'
import { Locales } from './constant'

export const LocaleQuery = z
  .object({
    locale: z.nativeEnum(Locales).default(Locales.fr),
  })
  .strict()
