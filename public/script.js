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
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();

        if (response.ok) {
            document.getElementById('result-message').innerHTML = `
                Extração Concluída!<br>
                Foram extraídos <strong>${data.totalFound || 0}</strong> leads.<br>
                A planilha foi baixada automaticamente.
            `;
            resultArea.classList.remove('hidden');

            if (data.leads && data.leads.length > 0) {
                downloadCSV(data.leads, niche, city);
            }
        } else {
            throw new Error(data.error || data.details || 'Erro desconhecido');
        }
    } catch (error) {
        document.getElementById('error-message').textContent = "Falha: " + error.message;
        errorArea.classList.remove('hidden');
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
// UTILS: Download CSV
// ========================================
function downloadCSV(data, niche, city) {
    if (!data || !data.length) return;

    const headers = ["niche", "nome", "telefone", "whatsapp_link", "cidade", "estado", "endereco", "site", "maps_url", "rating", "reviews"];
    const csvRows = [];
    
    // Configura o cabeçalho separado por ponto e vírgula
    csvRows.push(headers.join(";"));

    for (const row of data) {
        const values = headers.map(header => {
            let val = row[header] === null || row[header] === undefined ? "" : row[header];
            // Remove quebras de linha e escapa aspas duplas, substitui ; por , dentro do texto
            let cleanVal = String(val).replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
            return `"${cleanVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(";"));
    }

    const csvString = csvRows.join('\n');
    
    // Usa U+FEFF (BOM) para o Excel reconhecer os acentos (UTF-8) corretamente
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeNiche = (niche || 'leads').replace(/\s+/g, '_');
    const safeCity = (city || '').replace(/\s+/g, '_');
    link.setAttribute("download", `extrator_u3_${safeNiche}_${safeCity}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
