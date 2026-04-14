const puppeteer = require('puppeteer');

/**
 * Infer WhatsApp link from a phone number
 */
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

/**
 * Scrapes leads from Google Maps using Puppeteer (100% Free)
 */
async function searchLeads({ niche, city, state, limit = 20 }) {
    console.log(`🤖 Iniciando robô gratuito para: ${niche} em ${city}-${state}`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const query = encodeURIComponent(`${niche} em ${city} ${state}`);
        const url = `https://www.google.com/maps/search/${query}`;
        
        console.log(`🔗 Navegando para: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Espera um pouco para garantir que o layout carregou
        await new Promise(r => setTimeout(r, 3000));

        let leads = [];

        // CASO 1: Único Resultado (Redirecionamento Direto)
        const isSingleResult = await page.evaluate(() => !!document.querySelector('.DUwDvf'));
        
        if (isSingleResult) {
            console.log('📍 Detectado único resultado direto.');
            const lead = await page.evaluate((niche, city, state) => {
                const name = document.querySelector('.DUwDvf')?.textContent?.trim() || '';
                const address = document.querySelector('button[data-item-id="address"]')?.innerText?.trim() || 'Endereço não encontrado';
                const phone = document.querySelector('button[data-item-id^="phone:tel:"]')?.innerText?.trim() || 'Não informado';
                const mapsUrl = window.location.href;

                return {
                    nome: name,
                    maps_url: mapsUrl,
                    telefone: phone,
                    endereco: address,
                    niche: niche,
                    cidade: city,
                    estado: state
                };
            }, niche, city, state);

            if (lead.nome) {
                lead.whatsapp_link = createWhatsAppLink(lead.telefone);
                lead.data_coleta = new Date().toISOString();
                lead.ranking_maps = 1;
                leads.push(lead);
            }
        } else {
            // CASO 2: Lista de Resultados
            console.log('📋 Detectada lista de resultados.');
            let itemsProcessed = new Set();
            let scrollAttempts = 0;
            const maxScrollAttempts = 30;

            while (leads.length < limit && scrollAttempts < maxScrollAttempts) {
                const extracted = await page.evaluate(() => {
                    const results = [];
                    const links = Array.from(document.querySelectorAll('a.hfpxzc'));
                    
                    links.forEach(link => {
                        const parent = link.closest('div[role="article"]') || link.parentElement;
                        const name = link.getAttribute('aria-label') || '';
                        const mapsUrl = link.href;
                        
                        // Telefone e endereço por regex e split no texto do card (mais rápido para listas)
                        const allText = parent.innerText || '';
                        const phoneMatch = allText.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
                        const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                        
                        let address = 'Ver detalhes';
                        for (let line of lines) {
                            if (line !== name && !line.includes('estrelas') && !line.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/) && line.length > 10) {
                                address = line;
                                break;
                            }
                        }

                        results.push({
                            nome: name,
                            maps_url: mapsUrl,
                            telefone: phoneMatch ? phoneMatch[0] : 'Não informado',
                            endereco: address
                        });
                    });
                    return results;
                });

                for (let item of extracted) {
                    if (!itemsProcessed.has(item.maps_url) && leads.length < limit) {
                        itemsProcessed.add(item.maps_url);
                        leads.push({
                            ...item,
                            whatsapp_link: createWhatsAppLink(item.telefone),
                            niche: niche,
                            cidade: city,
                            estado: state,
                            data_coleta: new Date().toISOString(),
                            ranking_maps: leads.length + 1
                        });
                    }
                }

                if (leads.length >= limit) break;

                const scrollHappened = await page.evaluate(() => {
                    const feed = document.querySelector('div[role="feed"]');
                    if (feed) {
                        feed.scrollBy(0, 800);
                        return true;
                    }
                    return false;
                });

                if (!scrollHappened) break;
                await new Promise(r => setTimeout(r, 2000));
                scrollAttempts++;
            }
        }

        console.log(`✅ Robô finalizou com ${leads.length} leads.`);
        return leads;

    } catch (err) {
        console.error('❌ Erro no robô:', err.message);
        throw err;
    } finally {
        await browser.close().catch(() => {});
    }
}

module.exports = { searchLeads };
