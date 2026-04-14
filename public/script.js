// ========================================
// AUTH CHECK — redirect if not logged in
// ========================================
(async () => {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.authenticated) {
            document.getElementById('user-badge').textContent = `👤 ${data.user}`;
        } else {
            window.location.href = '/login.html';
        }
    } catch {
        window.location.href = '/login.html';
    }
})();

// ========================================
// LOGOUT
// ========================================
document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

// ========================================
// LEAD EXTRACTION FORM
// ========================================
document.getElementById('extractor-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const niche = document.getElementById('niche').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const limit = parseInt(document.getElementById('limit').value);
    const extraKeywords = document.getElementById('extraKeywords').value;

    const btn = document.getElementById('submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const resultArea = document.getElementById('result-area');
    const errorArea = document.getElementById('error-area');
    const progressContainer = document.getElementById('progress-container');

    // Loading State
    btn.disabled = true;
    btnText.textContent = 'Extraindo Leads...';
    loader.classList.remove('hidden');
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');
    progressContainer.classList.remove('hidden');

    // Animate progress bar
    const progressFill = document.querySelector('.progress-bar-fill');
    progressFill.style.width = '0%';
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 90) {
            progress += Math.random() * 8 + 2;
            if (progress > 90) progress = 90;
            progressFill.style.width = progress + '%';
        }
    }, 500);

    const resultWindow = window.open('', '_blank');
    if (resultWindow) {
        resultWindow.document.write(`
            <html><head><title>Aguarde...</title>
            <style>body{background:#050505;color:#fff;font-family:sans-serif;padding:2rem;} h2{color:#FFF600;}</style>
            </head><body><h2>🤖 O robô está extraindo seus leads...</h2><p>Não feche esta aba. Ela será preenchida com a tabela em poucos instantes.</p></body></html>
        `);
    } else {
        alert("Aviso: O seu navegador bloqueou a nova aba! Por favor, ative a permissão de pop-ups.");
    }

    try {
        const response = await fetch('/api/extract-leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                niche,
                city,
                state,
                limit,
                extraKeywords
            })
        });

        if (response.status === 401) {
            if(resultWindow) resultWindow.close();
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();

        if (response.ok) {
            document.getElementById('result-message').innerHTML = `
                Extração Concluída!<br>
                Foram extraídos <strong>${data.totalFound || 0}</strong> leads.<br>
                A aba foi atualizada com os resultados.
            `;
            resultArea.classList.remove('hidden');

            if (data.leads && data.leads.length > 0) {
                openLeadsInTab(data.leads, resultWindow);
            } else if (resultWindow) {
                resultWindow.close();
            }
        } else {
            throw new Error(data.error || data.details || 'Erro desconhecido');
        }
    } catch (error) {
        document.getElementById('error-message').textContent = "Falha: " + error.message;
        errorArea.classList.remove('hidden');
        if(resultWindow) resultWindow.close();
    } finally {
        // Complete progress bar animation
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        
        // Wait a moment to show 100% then reset
        await new Promise(r => setTimeout(r, 600));

        // Reset State
        btn.disabled = false;
        btnText.textContent = 'Iniciar Extração';
        loader.classList.add('hidden');
        progressContainer.classList.add('hidden');
        progressFill.style.width = '0%';
    }
});

// ========================================
// UTILS: Open Leads in New Tab
// ========================================
function openLeadsInTab(leads, newWindow) {
    if (!leads || leads.length === 0) return;

    if (!newWindow) {
        alert("Por favor, permita pop-ups do navegador para visualizar os leads.");
        return;
    }

    let html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Leads Extraídos - Lead Miner</title>
            <style>
                :root {
                    --bg-color: #0f172a;
                    --panel-bg: #1e293b;
                    --text-color: #f8fafc;
                    --accent-color: #38bdf8;
                    --border-color: #334155;
                }
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    background-color: var(--bg-color);
                    color: var(--text-color);
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 20px;
                    color: var(--accent-color);
                }
                .table-container {
                    background-color: var(--panel-bg);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    overflow-x: auto;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                th, td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                }
                th {
                    background-color: rgba(0,0,0,0.2);
                    font-weight: 600;
                    color: var(--accent-color);
                    white-space: nowrap;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                tr:hover {
                    background-color: rgba(255,255,255,0.02);
                }
                a {
                    color: var(--accent-color);
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                .btn-wa {
                    display: inline-block;
                    background-color: #25D366;
                    color: #fff;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-weight: bold;
                }
                .btn-wa:hover {
                    background-color: #128C7E;
                    text-decoration: none;
                }
                .info-text {
                    font-size: 14px;
                    color: #94a3b8;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Extrator Concluído: Foram encontrados \${leads.length} Leads</h1>
                <p class="info-text">Os dados abaixo representam a extração baseada na sua busca.</p>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Nicho</th>
                                <th>Cidade</th>
                                <th>Endereço</th>
                                <th>Telefone</th>
                                <th>Ação</th>
                                <th>Links</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    leads.forEach(lead => {
        const nome = lead.nome || '-';
        const niche = lead.niche || '-';
        const local = (lead.cidade && lead.estado) ? \`\${lead.cidade} - \${lead.estado}\` : (lead.cidade || '-');
        const endereco = lead.endereco || '-';
        const telefone = lead.telefone || '-';
        
        let acao = '-';
        if (lead.whatsapp_link) {
            acao = \`<a href="\${lead.whatsapp_link}" target="_blank" class="btn-wa">WhatsApp</a>\`;
        }

        let links = [];
        if (lead.site) links.push(\`<a href="\${lead.site}" target="_blank">Site</a>\`);
        if (lead.maps_url) links.push(\`<a href="\${lead.maps_url}" target="_blank">Maps</a>\`);

        html += \`
                            <tr>
                                <td><strong>\${nome}</strong></td>
                                <td>\${niche}</td>
                                <td>\${local}</td>
                                <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="\${endereco}">\${endereco}</td>
                                <td>\${telefone}</td>
                                <td>\${acao}</td>
                                <td>\${links.join(' <br> ')}</td>
                            </tr>
        \`;
    });

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
    `;

    newWindow.document.write(html);
    newWindow.document.close();
}
