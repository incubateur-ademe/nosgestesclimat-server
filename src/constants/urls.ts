export const CONNECT_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://prd-x-ademe-interne-api.de-c1.eu1.cloudhub.io/api/v1/personnes'
    : 'https://ppd-x-ademe-interne-api.de-c1.eu1.cloudhub.io/api/v1/personnes'
