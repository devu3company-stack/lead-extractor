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

    // Loading State
    btn.disabled = true;
    btnText.textContent = 'Extraindo Leads...';
    loader.classList.remove('hidden');
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');

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

        const data = await response.json();

        if (response.ok) {
            document.getElementById('result-message').innerHTML = `
                Fim do Lote.<br>
                Foram extraídos <strong>${data.totalFound || 0}</strong> leads.<br>
                Eles já estão na sua Planilha Google!
            `;
            resultArea.classList.remove('hidden');
        } else {
            throw new Error(data.error || data.details || 'Erro desconhecido');
        }
    } catch (error) {
        document.getElementById('error-message').textContent = "Falha: " + error.message;
        errorArea.classList.remove('hidden');
    } finally {
        // Reset State
        btn.disabled = false;
        btnText.textContent = 'Iniciar Extração';
        loader.classList.add('hidden');
    }
});
