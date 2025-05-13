import dayjs from 'dayjs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { recoverDayStats } from '../../src/features/stats/stats.service'
import logger from '../../src/logger'

const YYYY_MM_DD_REGEX = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/

const args = yargs(hideBin(process.argv))
  .option('date', {
    alias: 'd',
    type: 'string',
    description: 'The day to import format YYYY-MM-DD',
    default: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
  })
  .parse()

const main = async () => {
  const { date } = await args

  if (!YYYY_MM_DD_REGEX.test(date)) {
    logger.warn('Invalid date', date)
    return
  }

  await recoverDayStats(date)
}

main()
