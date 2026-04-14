const axios = require('axios');

function createWhatsAppLink(phoneNumber) {
    if (!phoneNumber) return '';
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
        return `https://wa.me/55${digits}`;
    }
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        return `https://wa.me/${digits}`;
    }
    return '';
}

function normalizeLocation(city, state) {
    return {
        normalizedCity: city.trim(),
        normalizedState: state.trim()
    };
}

async function searchLeads({ niche, city, state, limit = 20, extraKeywords = '' }) {
    const key = process.env.SERPAPI_KEY;
    if (!key) {
        throw new Error("SERPAPI_KEY is not defined in Environment Variables");
    }

    const { normalizedCity, normalizedState } = normalizeLocation(city, state);
    const query = encodeURIComponent(`${niche} ${extraKeywords} in ${normalizedCity} ${normalizedState}`.trim());

    let leads = [];
    let start = 0;

    try {
        while (leads.length < limit) {
            const url = `https://serpapi.com/search.json?engine=google_maps&q=${query}&start=${start}&api_key=${key}`;
            const response = await axios.get(url);
            
            const results = response.data.local_results;
            if (!results || results.length === 0) break;

            for (const place of results) {
                if (leads.length >= limit) break;

                const phone = place.phone || '';
                const website = place.website || '';
                
                const lead = {
                    lead_id: place.place_id || place.data_id || `id_${Math.random().toString(36).substr(2,9)}`,
                    niche: niche,
                    nome: place.title || '',
                    telefone: phone,
                    whatsapp_link: createWhatsAppLink(phone),
                    cidade: normalizedCity,
                    estado: normalizedState,
                    endereco: place.address || '',
                    site: website,
                    maps_url: place.links?.place || place.links?.directions || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title || '')}`,
                    rating: place.rating || 0,
                    reviews: place.reviews || 0,
                    anuncio_status: 'não identificado',
                    ranking_maps: leads.length + 1,
                    top3_maps: leads.length < 3 ? 'sim' : 'não',
                    data_coleta: new Date().toISOString(),
                    sync_status: 'novo',
                    saas_id: '',
                    obs: '',
                    lat: place.gps_coordinates?.latitude || '',
                    lng: place.gps_coordinates?.longitude || '',
                    types: place.type || ''
                };
                leads.push(lead);
            }
            
            // Handle SerpAPI Pagination
            if (response.data.serpapi_pagination && response.data.serpapi_pagination.next) {
                start += 20;
                await new Promise(r => setTimeout(r, 1000));
            } else {
                break;
            }
        }
        return leads;
    } catch (error) {
        console.error('Error fetching leads via SerpAPI:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { searchLeads };
