import crypto from 'crypto'
import type { Request } from 'express'
import type { Session } from '../../adapters/prisma/transaction'
import { config } from '../../config'
import { EventBus } from '../../core/event-bus/event-bus'
import { JobStartedEvent } from './events/JobStarted.event'
import type { JobKind, JobParams } from './jobs.repository'
import { createJob } from './jobs.repository'

export const getJobId = <T extends JobKind>({
  params,
  user,
}: {
  params: JobParams<T>
  user?: NonNullable<Request['user']>
}) => {
  const key = new URLSearchParams(
    Object.entries({
      ...params,
      ...(user ? user : {}),
    })
  ).toString()

  return crypto
    .createHash('sha256')
    .update(`${config.security.job.secret}${key}`)
    .digest('hex')
}

export const startJob = async <T extends JobKind>(
  {
    params,
    user,
  }: { params: JobParams<T>; user?: NonNullable<Request['user']> },
  session: { session: Session }
) => {
  const job = await createJob(
    {
      id: getJobId({
        params,
        user,
      }),
      params,
    },
    session
  )

  const jobStartedEvent = new JobStartedEvent({
    jobId: job.id,
  })

  EventBus.emit(jobStartedEvent)

  await EventBus.once(jobStartedEvent)

  return job
}
