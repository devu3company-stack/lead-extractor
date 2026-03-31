const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const credentialsPath = path.resolve(__dirname, '../credentials.json');
let auth;

try {
    if (fs.existsSync(credentialsPath)) {
        auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: SCOPES,
        });
    } else {
        console.warn("credentials.json not found! Google Sheets integration will fail if not configured in environment variables.");
        // Fallback to environment variables if possible, but GoogleAuth usually requires keyFile for service accounts
        // You might need to adjust auth initialization based on how you deploy (e.g., using Application Default Credentials)
    }
} catch (error) {
    console.error("Error initializing Google Auth:", error);
}

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEET_NAME = 'Leads';

/**
 * Get headers from the first row of the sheet to map data correctly
 */
async function getHeaders() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!1:1`,
        });

        return response.data.values ? response.data.values[0] : [];
    } catch (error) {
        console.error("Error fetching headers:", error);
        return [];
    }
}

/**
 * Fetch all existing lead IDs to prevent duplicates
 */
async function getExistingLeadIds() {
    try {
        const headers = await getHeaders();
        const idIndex = headers.indexOf('lead_id');

        if (idIndex === -1) {
            console.warn("Could not find 'lead_id' column in the sheet. Cannot deduplicate accurately.");
            return [];
        }

        // Fetch the column containing lead IDs (starting from row 2)
        const colLetter = String.fromCharCode(65 + idIndex); // Converts 0 to A, 1 to B, etc.
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!${colLetter}2:${colLetter}`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        return rows.map(row => row[0]).filter(id => id); // Filter out empty cells
    } catch (error) {
        console.error("Error fetching existing lead IDs:", error);
        return [];
    }
}

/**
 * Defines the standard set of columns requested by the user
 */
const STANDARD_HEADERS = [
    'lead_id', 'niche', 'nome', 'telefone', 'whatsapp_link', 'cidade', 'estado',
    'endereco', 'site', 'maps_url', 'rating', 'reviews', 'anuncio_status',
    'ranking_maps', 'top3_maps', 'data_coleta', 'sync_status', 'saas_id', 'obs'
];

/**
 * Ensure the sheet has the correct headers on row 1
 */
async function ensureHeaders() {
    try {
        const existingHeaders = await getHeaders();

        // Check if headers match the standard set
        const needsUpdate = STANDARD_HEADERS.some((col, idx) => existingHeaders[idx] !== col);

        if (existingHeaders.length === 0 || needsUpdate) {
            console.log("Initializing or updating sheet headers...");
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1:S1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [STANDARD_HEADERS]
                }
            });
            console.log("Headers updated.");
        }
    } catch (error) {
        // If the sheet doesn't exist, it will fail here. Handling that is slightly more complex, 
        // requiring sheets.spreadsheets.batchUpdate to add the sheet first.
        console.error("Error ensuring headers:", error);
        throw error;
    }
}

/**
 * Save extracted leads to Google Sheet with deduplication
 */
async function saveToSheet(leads) {
    if (!SPREADSHEET_ID) {
        throw new Error("GOOGLE_SHEET_ID is not defined in .env");
    }

    try {
        await ensureHeaders();
        const existingIds = await getExistingLeadIds();

        const newLeads = leads.filter(lead => !existingIds.includes(lead.lead_id));

        console.log(`Found ${leads.length} leads. ${existingIds.length} already exist. Saving ${newLeads.length} new leads.`);

        if (newLeads.length === 0) {
            return { saved: 0, reason: "All leads are duplicates." };
        }

        // Map lead objects to array of arrays matching headers
        const values = newLeads.map(lead => [
            lead.lead_id,
            lead.niche,
            lead.nome,
            lead.telefone,
            lead.whatsapp_link,
            lead.cidade,
            lead.estado,
            lead.endereco,
            lead.site,
            lead.maps_url,
            lead.rating,
            lead.reviews,
            lead.anuncio_status,
            lead.ranking_maps,
            lead.top3_maps,
            lead.data_coleta,
            lead.sync_status,
            lead.saas_id,
            lead.obs
        ]);

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:S`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values },
        });

        console.log(`${response.data.updates.updatedRows} rows appended to sheet.`);
        return { saved: response.data.updates.updatedRows, reason: "Success" };

    } catch (error) {
        console.error("Error saving to sheet:", error);
        throw error;
    }
}

module.exports = { saveToSheet };
