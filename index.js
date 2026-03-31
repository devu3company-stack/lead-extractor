require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { searchLeads } = require('./services/puppeteerScraper');
const { saveToSheet } = require('./services/csvExporter');
const { syncToSaaS } = require('./services/saasSync');
const { validateLeads } = require('./services/validator');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to trigger lead extraction
app.post('/api/extract-leads', async (req, res) => {
    try {
        const { niche, city, state, radius, limit, extraKeywords } = req.body;

        if (!niche || !city || !state) {
            return res.status(400).json({ error: 'Niche, city and state are required.' });
        }

        console.log(`Starting extraction for ${niche} in ${city} - ${state}...`);

        // 1. Fetch leads from Google Places API
        const leads = await searchLeads({ niche, city, state, radius, limit, extraKeywords });

        console.log(`Extraction finished. Found ${leads.length} leads.`);

        // 2. Save results to Google Sheet
        if (leads.length > 0) {
            await saveToSheet(leads);
            console.log('Successfully saved to Google Sheets.');
        }

        res.json({
            success: true,
            totalFound: leads.length,
            leads
        });
    } catch (error) {
        console.error('Error during extraction process:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Endpoint to trigger SaaS sync
app.post('/api/sync-saas', async (req, res) => {
    try {
        console.log('Starting SaaS Sync...');
        const result = await syncToSaaS();

        console.log(`Sync finished. Synced ${result.synced} leads with ${result.errors} errors.`);

        res.json({
            success: true,
            synced: result.synced,
            errors: result.errors
        });
    } catch (error) {
        console.error('Error during sync process:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Endpoint to trigger Ads/Ranking validation
app.post('/api/validate-leads', async (req, res) => {
    try {
        console.log('Starting Leads Validation...');
        const result = await validateLeads();

        console.log(`Validation finished. Validated ${result.validated} leads.`);

        res.json({
            success: true,
            validated: result.validated
        });
    } catch (error) {
        console.error('Error during validation process:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lead Extractor API running on port ${PORT}`);
});
