const express = require('express')
const apicache = require('apicache')

const router = express.Router()

const cache = apicache.options({
  headers: {
    'cache-control': 'no-cache',
  },
  debug: true,
}).middleware

const authorizedMethods = [
  'VisitsSummary.getVisits',
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
]

router.route('/').get(cache('1 day'), async (req, res, next) => {
  const rawRequestParams = decodeURIComponent(req.query.requestParams),
    requestParams = new URLSearchParams(rawRequestParams)

  const matomoMethod = requestParams.get('method'),
    idSite = requestParams.get('idSite')

  if (!matomoMethod || !idSite) {
    res.statusCode = 401
    return next('Error. Not Authorized')
  }

  const authorizedMethod = authorizedMethods.includes(matomoMethod)

  const authorizedSiteId = requestParams.get('idSite') === '153'

  if (!authorizedMethod || !authorizedSiteId) {
    res.statusCode = 401
    return next('Error. Not Authorized')
  }

  const url =
    'https://stats.data.gouv.fr/?' +
    requestParams +
    '&token_auth=' +
    process.env.MATOMO_TOKEN

  console.log('will make matomo request', requestParams)
  const response = await fetch(url)

  const json = await response.json()

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
})

const privateURLs = ['conférence/', 'conference/', 'sondage/']

const isPrivate = (rawString) => {
  const uriComponents = decodeURIComponent(rawString)

  return (
    uriComponents != undefined &&
    privateURLs.some((url) => uriComponents.includes(url))
  )
}

module.exports = router
