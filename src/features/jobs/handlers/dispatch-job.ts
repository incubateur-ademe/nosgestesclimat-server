import type { InputJsonValue } from '@prisma/client/runtime/library'
import { prisma } from '../../../adapters/prisma/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { JobCreatedAsyncEvent } from '../events/JobCreated.event'
import type { Job, JobKind } from '../jobs.repository'
import { runJob } from '../jobs.service'

const JobHandlerMap: Record<
  JobKind,
  (job: Job<JobKind>) => InputJsonValue | Promise<InputJsonValue>
> = {
  DOWNLOAD_ORGANISATION_POLL_SIMULATIONS_RESULT: () => ({}),
}

export const dispatchJob: Handler<JobCreatedAsyncEvent> = ({
  attributes: { jobId },
}) => {
  return runJob(jobId, (job) => JobHandlerMap[job.params.kind](job), {
    session: prisma,
  })
}
