const axios = require('axios');

async function runTest() {
    const base = 'http://localhost:3131';
    const headers = {};
    let cookie = '';

    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post(`${base}/api/login`, {
            username: 'baoderir@gmail.com',
            password: 'baoderir2026'
        });
        
        cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
        console.log("Login:", loginRes.data);
        console.log("Cookie:", cookie);

        console.log("\n2. Extracting leads...");
        const res = await axios.post(`${base}/api/extract-leads`, {
            niche: 'dentista',
            city: 'Campinas',
            state: 'SP',
            limit: 2,
            extraKeywords: ''
        }, {
            headers: { Cookie: cookie }
        });

        console.log("Status:", res.status);
        console.log("Leads found:", res.data.totalFound);
        console.log("First lead:", JSON.stringify(res.data.leads?.[0], null, 2));
    } catch (e) {
        console.error("Error status:", e.response?.status);
        console.error("Error body:", e.response?.data || e.message);
    }
}

runTest();
