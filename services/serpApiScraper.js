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

async function searchLeads({ niche, city, state, limit = 20, extraKeywords = '' }) {
    const key = process.env.SERPAPI_KEY;
    if (!key) {
        throw new Error("SERPAPI_KEY não definida nas variáveis de ambiente");
    }

    const query = encodeURIComponent(`${niche} ${extraKeywords} em ${city.trim()} ${state.trim()}`.trim());

    let leads = [];
    let start = 0;

    while (leads.length < limit) {
        const url = `https://serpapi.com/search.json?engine=google_maps&q=${query}&start=${start}&api_key=${key}&hl=pt-BR&gl=br`;

        let response;
        try {
            response = await axios.get(url, { timeout: 15000 });
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            throw new Error(`Erro ao chamar SerpAPI: ${msg}`);
        }

        const results = response.data.local_results;
        if (!results || results.length === 0) break;

        for (const place of results) {
            if (leads.length >= limit) break;

            const phone = place.phone || '';

            leads.push({
                lead_id: place.place_id || place.data_id || `id_${Math.random().toString(36).substr(2, 9)}`,
                niche,
                nome: place.title || '',
                telefone: phone,
                whatsapp_link: createWhatsAppLink(phone),
                cidade: city.trim(),
                estado: state.trim(),
                endereco: place.address || '',
                site: place.website || '',
                maps_url: place.links?.place || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title || '')}`,
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
            });
        }

        if (response.data.serpapi_pagination?.next) {
            start += 20;
            await new Promise(r => setTimeout(r, 1000));
        } else {
            break;
        }
    }

    return leads;
}

module.exports = { searchLeads };
