"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const apicache_1 = __importDefault(require("apicache"));
const config_1 = require("../../config");
const router = express_1.default.Router();
const cache = apicache_1.default.options({
    headers: {
        'cache-control': 'no-cache',
    },
    debug: true,
}).middleware;
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
];
router
    .route('/')
    .get(cache('1 day'), async (req, res, next) => {
    const rawRequestParams = decodeURIComponent(req.query.requestParams);
    const requestParams = new URLSearchParams(rawRequestParams);
    const matomoMethod = requestParams.get('method');
    const idSite = requestParams.get('idSite');
    if (!matomoMethod || !idSite) {
        res.statusCode = 401;
        return next('Error. Not Authorized');
    }
    const authorizedMethod = authorizedMethods.includes(matomoMethod);
    const authorizedSiteId = requestParams.get('idSite') === '153';
    if (!authorizedMethod || !authorizedSiteId) {
        res.statusCode = 401;
        return next('Error. Not Authorized');
    }
    const url = config_1.config.thirdParty.matomo.url +
        '?' +
        requestParams +
        '&token_auth=' +
        config_1.config.thirdParty.matomo.token;
    console.log('will make matomo request', requestParams);
    try {
        const response = await fetch(url);
        const json = (await response.json());
        // Remove secret pages that would reveal groupe names that should stay private
        if (rawRequestParams.includes('Page')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            return res.json(json.filter((el) => !isPrivate(el.label) &&
                !(el.subtable && el.subtable.find((t) => isPrivate(t.url)))));
        }
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        return res.json(json);
    }
    catch (e) {
        console.log('Erreur lors de la requête ou le parsing de la requête', url);
        console.log(e);
        res.statusCode = 500;
        return next('Error fetching or parsing stats ');
    }
});
const privateURLs = ['conférence/', 'conference/', 'sondage/'];
const isPrivate = (rawString) => {
    const uriComponents = decodeURIComponent(rawString);
    return (uriComponents !== undefined &&
        privateURLs.some((url) => uriComponents.includes(url)));
};
exports.default = router;
