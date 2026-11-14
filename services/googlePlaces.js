const axios = require('axios');

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';
const MAX_RESULTS = 60;
const FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.rating',
    'places.userRatingCount',
    'places.location',
    'places.types',
    'places.businessStatus',
    'nextPageToken'
].join(',');

function getApiKey() {
    // Vercel values may contain a trailing newline when pasted through the CLI.
    return (process.env.GOOGLE_PLACES_API_KEY || '').trim();
}

function createWhatsAppLink(phoneNumber) {
    if (!phoneNumber) return '';

    const digits = phoneNumber.replace(/\D/g, '');

    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        return `https://wa.me/${digits}`;
    }

    if (digits.length === 10 || digits.length === 11) {
        return `https://wa.me/55${digits}`;
    }

    return '';
}

function normalizeLimit(limit) {
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isFinite(parsed)) return 20;
    return Math.min(Math.max(parsed, 1), MAX_RESULTS);
}

function mapPlaceToLead(place, { niche, city, state }, ranking) {
    const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';

    return {
        lead_id: place.id,
        niche,
        nome: place.displayName?.text || '',
        telefone: phone,
        whatsapp_link: createWhatsAppLink(phone),
        cidade: city.trim(),
        estado: state.trim(),
        endereco: place.formattedAddress || '',
        site: place.websiteUri || '',
        maps_url: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
        rating: place.rating || 0,
        reviews: place.userRatingCount || 0,
        anuncio_status: 'não identificado',
        ranking_maps: ranking,
        top3_maps: ranking <= 3 ? 'sim' : 'não',
        data_coleta: new Date().toISOString(),
        sync_status: 'novo',
        saas_id: '',
        obs: place.businessStatus && place.businessStatus !== 'OPERATIONAL'
            ? `Status no Google: ${place.businessStatus}`
            : '',
        lat: place.location?.latitude || '',
        lng: place.location?.longitude || '',
        types: (place.types || []).join(','),
        source: 'google_places'
    };
}

function formatGoogleError(error) {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.error?.message;

    if (status === 403 && apiMessage?.includes('disabled')) {
        return new Error('A Places API (New) está desativada no projeto Google Cloud. Ative places.googleapis.com e tente novamente.');
    }

    if (apiMessage) {
        return new Error(`Erro do Google Places: ${apiMessage}`);
    }

    return new Error(`Erro ao consultar o Google Places: ${error.message}`);
}

async function searchLeads({ niche, city, state, limit = 20, extraKeywords = '' }) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('GOOGLE_PLACES_API_KEY não definida nas variáveis de ambiente');
    }

    const requestedLimit = normalizeLimit(limit);
    const textQuery = `${niche} ${extraKeywords} em ${city.trim()}, ${state.trim()}, Brasil`
        .replace(/\s+/g, ' ')
        .trim();

    const leads = [];
    const seenPlaceIds = new Set();
    let pageToken;

    try {
        do {
            const pageSize = Math.min(20, requestedLimit - leads.length);
            const requestBody = {
                textQuery,
                pageSize,
                languageCode: 'pt-BR',
                regionCode: 'BR',
                includePureServiceAreaBusinesses: true
            };

            if (pageToken) requestBody.pageToken = pageToken;

            const response = await axios.post(PLACES_API_URL, requestBody, {
                timeout: 20000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': FIELD_MASK
                }
            });

            for (const place of response.data.places || []) {
                if (leads.length >= requestedLimit) break;
                if (!place.id || seenPlaceIds.has(place.id)) continue;

                seenPlaceIds.add(place.id);
                leads.push(mapPlaceToLead(place, { niche, city, state }, leads.length + 1));
            }

            pageToken = response.data.nextPageToken;
        } while (pageToken && leads.length < requestedLimit);

        return leads;
    } catch (error) {
        throw formatGoogleError(error);
    }
}

module.exports = {
    searchLeads,
    createWhatsAppLink,
    mapPlaceToLead,
    normalizeLimit
};
