const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../leads.csv');

/**
 * Save leads locally to a CSV file without Google Sheets API
 */
async function saveToSheet(leads) {
    if (!leads || leads.length === 0) return { saved: 0, reason: "No leads to save." };

    console.log(`Saving ${leads.length} leads to local CSV: ${CSV_PATH}`);

    const fileExists = fs.existsSync(CSV_PATH);

    const csvWriter = createObjectCsvWriter({
        path: CSV_PATH,
        append: fileExists,
        header: [
            { id: 'lead_id', title: 'LEAD_ID' },
            { id: 'niche', title: 'NICHO' },
            { id: 'nome', title: 'NOME' },
            { id: 'telefone', title: 'TELEFONE' },
            { id: 'whatsapp_link', title: 'WHATSAPP_LINK' },
            { id: 'cidade', title: 'CIDADE' },
            { id: 'estado', title: 'ESTADO' },
            { id: 'endereco', title: 'ENDERECO' },
            { id: 'site', title: 'SITE' },
            { id: 'maps_url', title: 'MAPS_URL' },
            { id: 'rating', title: 'RATING' },
            { id: 'reviews', title: 'REVIEWS' },
            { id: 'anuncio_status', title: 'ANUNCIO_STATUS' },
            { id: 'ranking_maps', title: 'RANKING_MAPS' },
            { id: 'top3_maps', title: 'TOP3_MAPS' },
            { id: 'data_coleta', title: 'DATA_COLETA' },
            { id: 'sync_status', title: 'SYNC_STATUS' },
            { id: 'saas_id', title: 'SAAS_ID' },
            { id: 'obs', title: 'OBS' }
        ]
    });

    try {
        await csvWriter.writeRecords(leads);
        console.log(`Successfully appended to CSV.`);
        return { saved: leads.length, reason: "Saved to local CSV" };
    } catch (error) {
        console.error("Error writing to CSV:", error);
        throw error;
    }
}

module.exports = { saveToSheet };
