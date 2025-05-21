import { JobStatus } from '@prisma/client'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import crypto from 'crypto'
import type { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { transaction, type Session } from '../../adapters/prisma/transaction'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import logger from '../../logger'
import { JobCreatedEvent } from './events/JobCreated.event'
import { publishRedisEvent } from './handlers/publish-redis-event'
import type { Job, JobParams } from './jobs.repository'
import {
  createJob,
  getJob,
  JobKind,
  startJob,
  stopJob,
} from './jobs.repository'

export const JobFilesRootPath: Record<JobKind, string> = {
  [JobKind.DOWNLOAD_ORGANISATION_POLL_SIMULATIONS_RESULT]: `jobs/polls`,
}

EventBus.on(JobCreatedEvent, publishRedisEvent)

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

export const bootstrapJob = async <T extends JobKind>(
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

  const jobStartedEvent = new JobCreatedEvent({
    jobId: job.id,
  })

  EventBus.emit(jobStartedEvent)

  await EventBus.once(jobStartedEvent)

  return job
}

export const getPendingJobStatus = async <T extends JobKind>(
  {
    params,
    user,
    id,
  }: {
    id: string
    params: JobParams<T>
    user?: NonNullable<Request['user']>
  },
  session: { session: Session }
) => {
  if (id !== getJobId({ params, user })) {
    throw new ForbiddenException('Invalid job id')
  }

  const job = await getJob<T>({ id }, session)

  switch (job.status) {
    case JobStatus.failure:
      return {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        job: {},
      }
    case JobStatus.success:
      return {
        status: StatusCodes.OK,
        job: job.result,
      }
    default:
      return {
        status: StatusCodes.ACCEPTED,
        job,
      }
  }
}

export const runJob = <T extends JobKind>(
  id: string,
  callback: (job: Job<T>) => InputJsonValue | Promise<InputJsonValue>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (session) => {
    try {
      const job = await startJob<T>({ id }, { session })

      const result = await callback(job)

      await stopJob(
        {
          id,
          status: JobStatus.success,
          result,
        },
        { session }
      )
    } catch (e) {
      if (isPrismaErrorNotFound(e)) {
        throw new EntityNotFoundException('Job not found')
      }

      const err = e instanceof Error ? e : new Error(`Unexpected error: ${e}`)

      const {
        id: jobId,
        params: { kind },
      } = await stopJob(
        {
          id,
          status: JobStatus.failure,
          result: {
            name: err.name,
            stack: err.stack,
            message: err.message,
          },
        },
        { session }
      )

      logger.error(`Job ${jobId} ${kind} failed`, err)
    }
  }, session)
}
