import z from 'zod'

export const UserParams = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type UserParams = z.infer<typeof UserParams>
