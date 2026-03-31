const puppeteer = require('puppeteer');

/**
 * Infer WhatsApp link from a phone number
 */
function createWhatsAppLink(phoneNumber) {
    if (!phoneNumber) return '';
    const digits = phoneNumber.replace(/\D/g, '');

    if (digits.length === 12 || digits.length === 13) {
        if (digits.startsWith('55')) return `https://wa.me/${digits}`;
    }

    if (digits.length === 10 || digits.length === 11) {
        return `https://wa.me/55${digits}`;
    }

    return '';
}

/**
 * Delay function
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search Leads using Puppeteer (Free Google Maps Scraping)
 */
async function searchLeads({ niche, city, state, limit = 20, extraKeywords = '' }) {
    console.log(`Starting headless browser for searching ${niche}...`);
    const browser = await puppeteer.launch({
        headless: 'new', // or true
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set a normal user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const query = `${niche} ${extraKeywords} in ${city} ${state}`.trim();
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        let leads = [];
        let itemsExtracted = new Set();

        // The main container for search results in Google Maps
        // Usually, the items are under a role="feed"
        console.log('Waiting for results to load...');
        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

        console.log('Scrolling down to extract leads...');

        // Loop to scroll and extract
        while (leads.length < limit) {
            // Evaluates inside the browser to get all current visible leads' data
            const extracted = await page.evaluate(() => {
                const results = [];
                // 'hfpxzc' is usually the class for the main clickable link of a place card
                const cards = Array.from(document.querySelectorAll('a.hfpxzc'));

                for (let card of cards) {
                    // Pulo do Gato: Checar se o card pertence a anúncios pagos do maps (Patrocinado/Ads)
                    let isSponsored = false;
                    let parent = card.parentElement;
                    for (let i = 0; i < 6; i++) {
                        if (parent) {
                            const textCtx = parent.innerText || '';
                            if (textCtx.includes('Patrocinado') || textCtx.includes('Sponsored') || textCtx.includes('Ad')) {
                                isSponsored = true;
                                break;
                            }
                            parent = parent.parentElement;
                        }
                    }

                    if (!isSponsored) {
                        const url = card.href;
                        // The label usually contains "Name · Rating · Reviews · Type · ..."
                        const label = card.getAttribute('aria-label') || '';

                        if (label) {
                            results.push({ url, label });
                        }
                    }
                }
                return results;
            });

            // Process new extracted items
            for (let item of extracted) {
                if (!itemsExtracted.has(item.url) && leads.length < limit) {
                    itemsExtracted.add(item.url);

                    // Basic parsing of the aria-label string (since Google packs info in it)
                    // Note: full scraping involves clicking each card to get phone/website,
                    // but that is very slow. We grab the minimal available first.
                    // To make it truly valuable, let's open each link sequentially quickly, OR just return the maps URL for them to inspect.
                    // For a free reliable script, let's extract what we can without clicking all of them to prevent IP block.

                    leads.push({
                        lead_id: Buffer.from(item.url).toString('base64').substring(0, 15),
                        niche: niche,
                        nome: item.label, // Includes extra info, we leave it raw as name here for simplicity
                        telefone: 'Ver link abaixo', // Phone often requires clicking in the UI
                        whatsapp_link: '',
                        cidade: city,
                        estado: state,
                        endereco: 'Local listado no mapa',
                        site: '',
                        maps_url: item.url,
                        rating: '',
                        reviews: '',
                        anuncio_status: 'não identificado',
                        ranking_maps: leads.length + 1,
                        top3_maps: leads.length < 3 ? 'sim' : 'não',
                        data_coleta: new Date().toISOString(),
                        sync_status: 'novo',
                        saas_id: '',
                        obs: 'Encontrado via Scraper Gratuito'
                    });
                }
            }

            if (leads.length >= limit) break;

            // Scroll down the feed container
            const previousHeight = await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) {
                    const lastHeight = feed.scrollHeight;
                    feed.scrollTo(0, feed.scrollHeight);
                    return lastHeight;
                }
                return 0;
            });

            await delay(2500); // wait for new items to load

            // Check if end of list is reached
            const currentHeight = await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                return feed ? feed.scrollHeight : 0;
            });

            if (previousHeight === currentHeight) {
                // Try scrolling one more time or break
                console.log('End of list reached or Google requested captcha.');
                break;
            }
        }

        console.log(`Extracted ${leads.length} leads.`);
        await browser.close();

        // Clean up the name string (Extract "Name" from "Name · Rating · Reviews...")
        leads = leads.map(lead => {
            const parts = lead.nome.split('·');
            lead.nome = parts[0]?.trim() || lead.nome;
            if (parts[1] && parts[1].includes('(')) {
                // Rating might be in part 1
                const ratingMatch = parts[1].match(/([0-9,.]+)\s*\(([\d.,]+)\)/);
                if (ratingMatch) {
                    lead.rating = ratingMatch[1];
                    lead.reviews = ratingMatch[2];
                }
            }
            return lead;
        });

        return leads;

    } catch (error) {
        console.error('Error during scraping:', error.message);
        await browser.close().catch(() => false);
        throw error;
    }
}

module.exports = { searchLeads };
