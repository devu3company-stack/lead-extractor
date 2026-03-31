const axios = require('axios');
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
    }
} catch (error) {
    console.error("Error initializing Google Auth:", error);
}

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SAAS_API_URL = process.env.SAAS_API_URL;
const SAAS_API_TOKEN = process.env.SAAS_API_TOKEN;

const SHEET_NAME = 'Leads';

/**
 * Sync leads from Google Sheets to SaaS CRM
 */
async function syncToSaaS() {
    if (!SPREADSHEET_ID || !SAAS_API_URL || !SAAS_API_TOKEN) {
        throw new Error("Missing Google Sheets or SaaS configuration in .env");
    }

    try {
        console.log("Fetching leads from Google Sheets...");

        // 1. Get all data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:S`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) { // 1 row is just headers
            console.log("No leads to sync.");
            return { synced: 0, errors: 0 };
        }

        const headers = rows[0];
        const syncStatusIndex = headers.indexOf('sync_status');
        const saasIdIndex = headers.indexOf('saas_id');
        const leadIdIndex = headers.indexOf('lead_id');

        if (syncStatusIndex === -1 || saasIdIndex === -1 || leadIdIndex === -1) {
            throw new Error("Missing required columns in sheet (sync_status, saas_id, lead_id).");
        }

        let syncedCount = 0;
        let errorCount = 0;

        // Prepare batch updates for Google Sheets
        const updates = [];

        // 2. Iterate through rows (start at index 1 to skip headers)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const status = row[syncStatusIndex] || '';

            if (status.toLowerCase() === 'novo' || status.toLowerCase() === 'erro') {
                try {
                    // Create an object mapping headers to row values
                    const leadData = {};
                    headers.forEach((header, index) => {
                        leadData[header] = row[index] || '';
                    });

                    console.log(`Sending lead ${leadData.nome} (${leadData.lead_id}) to SaaS...`);

                    // 3. Send to SaaS API
                    const saasResponse = await axios.post(SAAS_API_URL, leadData, {
                        headers: {
                            'Authorization': `Bearer ${SAAS_API_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    // 4. Update status and SaaS ID
                    const saasId = saasResponse.data.id || 'generated-id-if-not-provided';

                    // Add to batch update array
                    updates.push({
                        range: `${SHEET_NAME}!R${i + 1}:R${i + 1}`, // saas_id column is R (index 17)
                        values: [[saasId]]
                    });

                    updates.push({
                        range: `${SHEET_NAME}!Q${i + 1}:Q${i + 1}`, // sync_status column is Q (index 16)
                        values: [['enviado']]
                    });

                    syncedCount++;

                } catch (error) {
                    console.error(`Error syncing lead at row ${i + 1}:`, error.message);

                    // Mark as error
                    updates.push({
                        range: `${SHEET_NAME}!Q${i + 1}:Q${i + 1}`,
                        values: [['erro']]
                    });
                    errorCount++;
                }
            }
        }

        // 5. Update Google Sheets with results
        if (updates.length > 0) {
            console.log(`Updating ${updates.length / 2} rows in Google Sheets...`);
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }

        return { synced: syncedCount, errors: errorCount };

    } catch (error) {
        console.error("Sync process failed:", error);
        throw error;
    }
}

module.exports = { syncToSaaS };
