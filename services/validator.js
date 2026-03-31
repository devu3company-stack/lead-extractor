const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

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
const SERP_API_KEY = process.env.SERP_API_KEY; // For third-party SERP API like SerpApi or ValueSERP
const SHEET_NAME = 'Leads';

/**
 * Placeholder logic to check if domain runs ads
 * In real life you would use SEMrush, SpyFu API, or similar
 */
async function checkAdsIndicator(website) {
    if (!website) return 'não identificado';

    // Very basic heuristic
    try {
        const response = await axios.get(website, { timeout: 5000 });
        const html = response.data.toLowerCase();

        // Check for common scripts indicating ads
        if (html.includes('googletagmanager') || html.includes('gtag(') || html.includes('fbq(')) {
            return 'provável';
        }
    } catch (error) {
        // ignore errors getting website
    }

    return 'não identificado';
}

/**
 * Validates leads for ads indication and maps ranking
 */
async function validateLeads() {
    if (!SPREADSHEET_ID) {
        throw new Error("Missing SPREADSHEET_ID in .env");
    }

    try {
        console.log("Fetching leads for validation...");

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:S`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) return { validated: 0 };

        const headers = rows[0];
        const siteIndex = headers.indexOf('site');
        const statusIdx = headers.indexOf('anuncio_status');

        if (siteIndex === -1 || statusIdx === -1) {
            throw new Error("Missing columns for validation.");
        }

        const updates = [];
        let validatedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const site = row[siteIndex];
            const currentStatus = row[statusIdx];

            // Only validate if not identified yet and has site
            if (site && (!currentStatus || currentStatus === 'não identificado')) {
                console.log(`Validating site: ${site}`);
                const adStatus = await checkAdsIndicator(site);

                if (adStatus !== 'não identificado') {
                    updates.push({
                        range: `${SHEET_NAME}!M${i + 1}:M${i + 1}`, // M is column 13 (index 12) for anuncio_status
                        values: [[adStatus]]
                    });
                    validatedCount++;
                }
            }
        }

        if (updates.length > 0) {
            console.log(`Updating ${updates.length} rows with validation results...`);
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }

        return { validated: validatedCount };

    } catch (error) {
        console.error("Validation failed:", error);
        throw error;
    }
}

module.exports = { validateLeads };
