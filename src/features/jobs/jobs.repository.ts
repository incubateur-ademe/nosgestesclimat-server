import { JobStatus } from '@prisma/client'
import { defaultJobSelection } from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import type { ValueOf } from '../../types/types'

export const JobKind = {
  DOWNLOAD_ORGANISATION_POLL_SIMULATIONS_RESULT:
    'DOWNLOAD_ORGANISATION_POLL_SIMULATIONS_RESULT',
} as const

export type JobKind = ValueOf<typeof JobKind>

export type JobParams<T extends JobKind> =
  T extends 'DOWNLOAD_ORGANISATION_POLL_SIMULATIONS_RESULT'
    ? {
        kind: T
        pollId: string
        organisationId: string
      }
    : never

export const createJob = <T extends JobKind>(
  { id, params }: { id: string; params: JobParams<T> },
  { session }: { session: Session }
) =>
  session.job.upsert({
    where: { id },
    create: {
      executions: {
        create: {
          date: new Date(),
        },
      },
      status: JobStatus.pending,
      params,
      id,
    },
    update: {
      executions: {
        create: {
          date: new Date(),
        },
      },
      status: JobStatus.pending,
      params,
      id,
    },
    select: defaultJobSelection,
  })
