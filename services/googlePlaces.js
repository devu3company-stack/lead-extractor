const axios = require('axios');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * Infer WhatsApp link from a phone number
 * Only works if it's a mobile number in Brazil (starting with 9 after DDD usually, but we keep it simple here)
 */
function createWhatsAppLink(phoneNumber) {
    if (!phoneNumber) return '';
    // Remove all non-numeric characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Check if it's a full Brazilian number with country code
    if (digits.length === 12 || digits.length === 13) {
        if (digits.startsWith('55')) {
            return `https://wa.me/${digits}`;
        }
    }

    // If it's just DDD + number (e.g. 11988887777), prepend 55
    if (digits.length === 10 || digits.length === 11) {
        return `https://wa.me/55${digits}`;
    }

    return '';
}

/**
 * Normalizes city and state to avoid duplicated entries with different cases
 */
function normalizeLocation(city, state) {
    return {
        normalizedCity: city.trim(), // Consider using a better normalization map
        normalizedState: state.trim()
    };
}

/**
 * Delay function to handle pagination
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get Place Details (to get phone, website, url)
 */
async function getPlaceDetails(placeId) {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number,website,url&key=${API_KEY}`;
        const response = await axios.get(url);
        return response.data.result || {};
    } catch (error) {
        console.error(`Error fetching details for place_id ${placeId}:`, error.message);
        return {};
    }
}

/**
 * Search Leads using Google Places Text Search API
 */
async function searchLeads({ niche, city, state, radius, limit = 20, extraKeywords = '' }) {
    if (!API_KEY) {
        throw new Error("GOOGLE_PLACES_API_KEY is not defined in .env");
    }

    const { normalizedCity, normalizedState } = normalizeLocation(city, state);
    const query = `${niche} ${extraKeywords} in ${normalizedCity} ${normalizedState}`.trim();

    let leads = [];
    let nextPageToken = null;
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;

    try {
        do {
            if (nextPageToken) {
                // Wait a bit before using next_page_token (Google API requirement)
                await delay(2000);
                url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${API_KEY}`;
            }

            const response = await axios.get(url);
            const results = response.data.results;

            if (!results || results.length === 0) break;

            for (const place of results) {
                if (leads.length >= limit) break;

                // Fetch details to get phone and website (which are often missing in textsearch response)
                const details = await getPlaceDetails(place.place_id);

                const phone = details.formatted_phone_number || details.international_phone_number || '';
                const website = details.website || '';

                const lead = {
                    lead_id: place.place_id,
                    niche: niche,
                    nome: place.name,
                    telefone: phone,
                    whatsapp_link: createWhatsAppLink(phone),
                    cidade: normalizedCity,
                    estado: normalizedState,
                    endereco: place.formatted_address || '',
                    site: website,
                    maps_url: details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                    rating: place.rating || 0,
                    reviews: place.user_ratings_total || 0,
                    anuncio_status: 'não identificado', // Placeholder for SaaS validation
                    ranking_maps: leads.length + 1, // Basic ranking based on return order
                    top3_maps: leads.length < 3 ? 'sim' : 'não',
                    data_coleta: new Date().toISOString(),
                    sync_status: 'novo',
                    saas_id: '',
                    obs: '',
                    lat: place.geometry?.location?.lat || '',
                    lng: place.geometry?.location?.lng || '',
                    types: (place.types || []).join(', ')
                };

                leads.push(lead);
            }

            nextPageToken = response.data.next_page_token;

        } while (nextPageToken && leads.length < limit);

        return leads;
    } catch (error) {
        console.error('Error fetching leads:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { searchLeads };
