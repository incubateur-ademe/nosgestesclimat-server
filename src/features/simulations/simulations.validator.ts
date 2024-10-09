import z from 'zod'

export const SituationSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z
      .object({
        valeur: z.union([
          z.coerce.number(),
          z
            .string()
            .transform((s) => +s.replace(/\s/g, ''))
            .pipe(z.coerce.number()),
        ]),
        unité: z.string().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal('number'),
        fullPrecision: z.boolean(),
        nodeValue: z.number(),
        nodeKind: z.literal('constant'),
        rawNode: z.number(),
        isNullable: z.boolean().optional(),
        missingVariables: z.object({}).optional(),
      })
      .strict(),
    z
      .object({
        explanation: z
          .object({
            type: z.literal('number'),
            fullPrecision: z.boolean(),
            nodeValue: z.number(),
            nodeKind: z.literal('constant'),
            rawNode: z
              .object({
                constant: z
                  .object({
                    type: z.union([z.literal('constant'), z.literal('number')]),
                    nodeValue: z.number(),
                  })
                  .strict(),
              })
              .strict(),
            isNullable: z.boolean().optional(),
            missingVariables: z.object({}).optional(),
          })
          .strict(),
        unit: z
          .object({
            numerators: z.string(),
            denominators: z.string().optional(),
          })
          .strict(),
        nodeKind: z.literal('unité'),
        rawNode: z.string(),
      })
      .strict(),
  ])
)

export type SituationSchemaInput = z.input<typeof SituationSchema>

export type SituationSchema = z.infer<typeof SituationSchema>
