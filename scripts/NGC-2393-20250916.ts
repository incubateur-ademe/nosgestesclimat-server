import { MatomoStatsSource } from '@prisma/client'
import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { clients } from '../src/adapters/matomo/index.js'
import {
  emailsKeys,
  nameKeys,
  okQueryValuesRegexes,
  okQueryValuesSets,
  otherUrlKeys,
} from './constants/sets.js'
import rawLeakedEmails from './output/leakedEmails.json' with { type: 'json' }
import rawLeakedNames from './output/leakedNames.json' with { type: 'json' }
import rawOtherUrls from './output/otherUrls.json' with { type: 'json' }
import rawProblematicUrls from './output/problematicUrls.json' with { type: 'json' }

const client = clients[MatomoStatsSource.beta]
const start = new Date('2025-01-01T00:00:00.000')
const end = new Date('2025-09-12T00:00:00.000')

const getAllPages = async (date: string) => {
  const allPages = []
  const rootPages = await client.getPageUrls({ date })

  for (const rootPage of rootPages) {
    allPages.push(rootPage)

    if (typeof rootPage.idsubdatatable === 'number') {
      const queue = [rootPage.idsubdatatable]

      while (queue.length) {
        const idsubdatatable = queue.pop()

        const subPages = await client.getPageUrls({
          date,
          idsubdatatable,
        })

        for (const subPage of subPages) {
          allPages.push(subPage)

          if (subPage.idsubdatatable) {
            queue.push(subPage.idsubdatatable)
          }
        }
      }
    }
  }

  return allPages
}

const main = async () => {
  let date = dayjs(start)
  const periodMap: Record<string, string[]> = {}
  const otherUrls = new Set<string>(rawOtherUrls)
  const problematicUrls = new Set<string>(rawProblematicUrls)
  const allEmails = new Set<string>(rawLeakedEmails)
  const allNames = new Set<string>(rawLeakedNames)

  try {
    while (date.toDate() < end) {
      console.log('Processing day', date.format('YYYY-MM-DD'))
      const allPages = await getAllPages(date.format('YYYY-MM-DD'))

      for (const page of allPages) {
        const url = page.url || page.segment

        if (!url) {
          if (page.label !== 'Autres') {
            console.warn('No url in page', page)
          }
          continue
        }

        url.searchParams.forEach((value, key) => {
          if (value === '') {
            return
          }

          key = key.replace(/^(amp;)+/, '')

          const mapKey = key.toLocaleLowerCase()

          if (
            okQueryValuesSets[mapKey] &&
            okQueryValuesSets[mapKey].has(value)
          ) {
            return
          }

          if (
            okQueryValuesRegexes[mapKey] &&
            okQueryValuesRegexes[mapKey].test(value)
          ) {
            return
          }

          if (emailsKeys.has(mapKey)) {
            problematicUrls.add(`${mapKey}-${url.pathname}`)
            const rawEmail = value.replace(/\/*-*%?$/, '')

            const parsedEmail = z.string().email().safeParse(rawEmail)

            if (parsedEmail.success) {
              allEmails.add(parsedEmail.data)
            } else {
              console.warn('invalid email', rawEmail)
              allEmails.add(rawEmail)
            }

            return
          }

          if (nameKeys.has(mapKey)) {
            problematicUrls.add(`${mapKey}-${url.pathname}`)
            allNames.add(value)

            return
          }

          if (otherUrlKeys.has(mapKey)) {
            otherUrls.add(value)

            return
          }

          const set = new Set(periodMap[mapKey] || [])
          set.add(value)
          periodMap[mapKey] = Array.from(set)
        })
      }

      date = date.add(1, 'day')
    }
  } catch (e) {
    console.error('Stopped at', date.format('YYYY-MM-DD'), e)
  }

  fs.writeFileSync(
    path.join(import.meta.dirname, 'output', 'map.json'),
    JSON.stringify(periodMap, null, 2)
  )

  fs.writeFileSync(
    path.join(import.meta.dirname, 'output', 'leakedEmails.json'),
    JSON.stringify(Array.from(allEmails).sort(), null, 2)
  )

  fs.writeFileSync(
    path.join(import.meta.dirname, 'output', 'leakedNames.json'),
    JSON.stringify(Array.from(allNames).sort(), null, 2)
  )

  fs.writeFileSync(
    path.join(import.meta.dirname, 'output', 'problematicUrls.json'),
    JSON.stringify(Array.from(problematicUrls), null, 2)
  )

  fs.writeFileSync(
    path.join(import.meta.dirname, 'output', 'otherUrls.json'),
    JSON.stringify(Array.from(otherUrls), null, 2)
  )
}

main()
