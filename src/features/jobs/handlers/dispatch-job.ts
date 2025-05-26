import { prisma } from '../../../adapters/prisma/client'
import type { Handler } from '../../../core/event-bus/handler'
import { uploadPollSimulationsResult } from '../../organisations/organisations.service'
import type { JobCreatedAsyncEvent } from '../events/JobCreated.event'
import { JobKind } from '../jobs.repository'
import { runJob } from '../jobs.service'

export const dispatchJob: Handler<JobCreatedAsyncEvent> = ({
  attributes: { jobId },
}) => {
  return runJob(
    jobId,
    (job) => {
      switch (job.params.kind) {
        case JobKind.DOWNLOAD_ORGANISATION_POLL_SIMULATIONS_RESULT:
          return uploadPollSimulationsResult(job.params)
      }
    },
    {
      session: prisma,
    }
  )
}
