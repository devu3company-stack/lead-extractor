const { searchLeads: searchGooglePlaces } = require('./googlePlaces');
const { searchLeads: searchSerpApi } = require('./serpApiScraper');

/**
 * Prefer Google Places and keep SerpAPI as a resilience fallback. This keeps a
 * temporary Google API outage or an unset Places key from taking the extractor
 * down when SerpAPI is available.
 */
async function searchGoogleLeads(params) {
    try {
        const leads = await searchGooglePlaces(params);
        return { leads, provider: 'google_places' };
    } catch (googleError) {
        if (!(process.env.SERPAPI_KEY || '').trim()) {
            throw googleError;
        }

        console.warn(`Google Places unavailable; using Google Maps fallback: ${googleError.message}`);
        const leads = await searchSerpApi(params);

        return {
            leads,
            provider: 'serpapi_google_maps',
            fallbackReason: googleError.message
        };
    }
}

module.exports = { searchGoogleLeads };
