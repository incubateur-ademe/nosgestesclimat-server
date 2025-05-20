import apicache from 'apicache'
import type { NextFunction, Request, Response } from 'express'
import express from 'express'
import { config } from '../../config'

const router = express.Router()

const cache = apicache.options({
  headers: {
    'cache-control': 'no-cache',
  },
  debug: true,
}).middleware

const authorizedMethods = [
  'VisitsSummary.getVisits',
  'VisitorInterest.getNumberOfVisitsPerVisitDuration',
  'VisitFrequency.get',
  'Actions.getPageUrl',
  'Referrers.getWebsites',
  'Referrers.getSocials',
  'Referrers.getKeywords',
  'Actions.getEntryPageUrls',
  'Actions.getPageUrls',
  'Events.getAction',
  'Events.getCategory',
  'Actions.getPageUrl',
]

const privateURLs = ['conférence/', 'conference/', 'sondage/']

const isPrivate = (rawString: string) => {
  const uriComponents = decodeURIComponent(rawString)

  return (
    uriComponents !== undefined &&
    privateURLs.some((url) => uriComponents.includes(url))
  )
}

router
  .route('/')
  .get(
    cache('1 day'),
    async (req: Request, res: Response, next: NextFunction) => {
      let url
      try {
        const rawRequestParams = decodeURIComponent(
          req.query.requestParams as string
        )

        const requestParams = new URLSearchParams(rawRequestParams)

        const matomoMethod = requestParams.get('method')

        const idSite = requestParams.get('idSite')

        if (!matomoMethod || !idSite) {
          res.statusCode = 401
          return next('Error. Not Authorized')
        }

        const authorizedMethod = authorizedMethods.includes(matomoMethod)

        const authorizedSiteId =
          requestParams.get('idSite') === config.thirdParty.matomo.data.siteId

        if (!authorizedMethod || !authorizedSiteId) {
          res.statusCode = 401
          return next('Error. Not Authorized')
        }

        url =
          config.thirdParty.matomo.data.url +
          '?' +
          requestParams +
          '&token_auth=' +
          config.thirdParty.matomo.data.token

        console.log('will make matomo request', requestParams)

        const response = await fetch(url)

        const json = (await response.json()) as {
          label: string
          subtable: { url: string }[]
        }[]

        // Remove secret pages that would reveal groupe names that should stay private
        if (rawRequestParams.includes('Page')) {
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          return res.json(
            json.filter(
              (el) =>
                !isPrivate(el.label) &&
                !(el.subtable && el.subtable.find((t) => isPrivate(t.url)))
            )
          )
        }

        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        return res.json(json)
      } catch (e) {
        console.warn(e)
        return res.status(500).send('Error fetching or parsing stats ')
      }
    }
  )

export default router
