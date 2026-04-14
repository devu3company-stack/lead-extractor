const { searchLeads } = require('./services/mapsScraper');

async function testExtraction() {
    try {
        const leads = await searchLeads({
            niche: 'Casa de Bolos',
            city: 'Campinas',
            state: 'SP',
            limit: 5
        });
        console.log('--- Extracted Leads ---');
        console.table(leads);
    } catch (error) {
        console.error('Extraction failed:', error);
    }
}

testExtraction();
