import z from 'zod'

export const UserParams = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type UserParams = z.infer<typeof UserParams>

export const FetchUserBrevoContactValidator = {
  body: z.object({}).strict().optional(),
  params: UserParams,
  query: z.object({}).strict().optional(),
}
