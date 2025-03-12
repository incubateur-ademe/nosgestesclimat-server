import axios from 'axios'
import type Redis from 'ioredis'
import { createGunzip } from 'node:zlib'
import Papa from 'papaparse'
import { KEYS } from '../../src/adapters/redis/constant'
import { converIpToNumber } from '../../src/features/geolocation/geolocation.service'

export const exec = async ({ redis }: { redis: Redis }) => {
  try {
    const geoipUrl = process.env.GEOIP_URL

    if (!geoipUrl) {
      throw new Error('GEOIP_URL is required')
    }

    const today = new Date()

    const datasourceStream = (
      await axios.get(
        geoipUrl.replace(
          '{{YYYY-MM}}',
          `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`
        ),
        {
          responseType: 'stream',
        }
      )
    ).data.pipe(createGunzip())

    const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: false,
    })

    datasourceStream.pipe(parseStream)

    const sortedArray = []

    for await (const chunk of parseStream) {
      const [ipStart, _, countryCode] = chunk

      // Ignore IPv6 addresses
      if (!ipStart.includes('.')) {
        continue
      }

      const ipStartNumber = converIpToNumber(ipStart)
      sortedArray.push({ ipStartNum: ipStartNumber, countryCode })
    }

    await redis.set(KEYS.geolocation, JSON.stringify(sortedArray))
    await redis.persist(KEYS.geolocation)
    console.log(`Stored ${sortedArray.length} IPs to redis`)
  } catch (err) {
    console.error('Geolocation error', err)
    throw err
  }
}
