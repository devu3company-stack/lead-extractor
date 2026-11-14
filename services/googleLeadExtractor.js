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
        if (leads.length > 0 || !(process.env.SERPAPI_KEY || '').trim()) {
            return { leads, provider: 'google_places' };
        }

        console.warn('Google Places returned no leads; using Google Maps fallback.');
        let fallbackLeads;
        try {
            fallbackLeads = await searchSerpApi(params);
        } catch (serpError) {
            throw createProvidersUnavailableError(googleError, serpError);
        }
        return {
            leads: fallbackLeads,
            provider: 'serpapi_google_maps',
            fallbackReason: 'Google Places returned no leads'
        };
    } catch (googleError) {
        if (!(process.env.SERPAPI_KEY || '').trim()) {
            throw googleError;
        }

        console.warn(`Google Places unavailable; using Google Maps fallback: ${googleError.message}`);
        let leads;
        try {
            leads = await searchSerpApi(params);
        } catch (serpError) {
            throw createProvidersUnavailableError(googleError, serpError);
        }

        return {
            leads,
            provider: 'serpapi_google_maps',
            fallbackReason: googleError.message
        };
    }
}

function createProvidersUnavailableError(googleError, serpError) {
    const error = new Error(
        `Google Places indisponível: ${googleError.message}. `
        + `SerpAPI indisponível: ${serpError.message}. `
        + 'Configure uma chave Google Places válida ou reponha a quota da SerpAPI.'
    );
    error.code = 'LEAD_PROVIDERS_UNAVAILABLE';
    return error;
}

module.exports = { searchGoogleLeads };
