require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { searchLeads } = require('./services/googlePlaces');
const { saveToSheet } = require('./services/csvExporter');
const { syncToSaaS } = require('./services/saasSync');
const { validateLeads } = require('./services/validator');
const path = require('path');
const admin = require('firebase-admin');

// ========================================
// FIREBASE INITIALIZATION
// ========================================
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin Initialized ✅');
} catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.log('⚠️ Running without database integration (will use .env USERS)');
}

const db = admin.apps.length ? admin.firestore() : null;

const app = express();
app.use(cors());
app.use(express.json());

// ========================================
// SESSION CONFIG
// ========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'lead-miner-secret-key-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Trust proxy for Render/Railway (HTTPS behind load balancer)
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// ========================================
// USER MANAGEMENT (via Environment Variable)
// ========================================
// Format: USERS=user1:password1,user2:password2,user3:password3
// Example: USERS=joao:MinhaS3nh@,maria:Outr@Senha!
// ========================================

function getUsers() {
    const usersEnv = process.env.USERS || 'admin:admin123,baoderir@gmail.com:baoderir2026';
    const users = {};
    usersEnv.split(',').forEach(pair => {
        const [username, password] = pair.trim().split(':');
        if (username && password) {
            users[username.toLowerCase()] = password;
        }
    });
    return users;
}

// ========================================
// AUTH MIDDLEWARE
// ========================================
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    // For API calls, return 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    // For page requests, redirect to login
    return res.redirect('/login.html');
}

// ========================================
// AUTH ROUTES (public)
// ========================================

// Serve login page (no auth needed)
app.get('/login.html', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    try {
        let storedPassword = null;
        const normalizedUsername = username.toLowerCase().trim();

        // 1. Tentar buscar no Cloud Firestore (Prioridade)
        if (db) {
            const userDoc = await db.collection('users').doc(normalizedUsername).get();
            if (userDoc.exists) {
                storedPassword = userDoc.data().password;
            }
        }

        // 2. Fallback para variáveis de ambiente (.env) caso não esteja no DB
        if (!storedPassword) {
            const envUsers = getUsers();
            storedPassword = envUsers[normalizedUsername];
        }

        // 3. Validar senha (comparação direta ou bcrypt se começar com $)
        if (storedPassword && storedPassword === password) {
            req.session.user = {
                username: normalizedUsername,
                loginAt: new Date().toISOString(),
                source: db ? 'firebase' : 'env'
            };
            console.log(`✅ Login: ${normalizedUsername} at ${new Date().toISOString()}`);
            return res.json({ success: true });
        }

        console.log(`❌ Login failed: ${username} at ${new Date().toISOString()}`);
        return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'Erro interno ao realizar login.' });
    }
});

// Logout API
app.post('/api/logout', (req, res) => {
    const user = req.session.user?.username || 'unknown';
    req.session.destroy(() => {
        console.log(`👋 Logout: ${user}`);
        res.json({ success: true });
    });
});

// ========================================
// CAKTO WEBHOOK - AUTOMATIC USER CREATION
// ========================================
app.post('/api/webhook/cakto', async (req, res) => {
    const payload = req.body;
    console.log('📦 Webhook received from Cakto:', payload.event || 'No event');

    try {
        // Evento de compra aprovada
        if (payload.event === 'purchase_approved' || payload.event === 'subscription_renewed') {
            const customer = payload.data.customer;
            const email = customer.email.toLowerCase().trim();
            
            // Usamos o CPF como senha inicial, ou o próprio e-mail se o CPF não vier
            const password = customer.docNumber ? customer.docNumber.replace(/\D/g, '') : email;

            if (!db) {
                console.error('❌ Firestore not initialized. Cannot create user.');
                return res.status(500).send('Database unavailable');
            }

            // Criar ou atualizar usuário no Firestore
            await db.collection('users').doc(email).set({
                password: password, 
                name: customer.name || 'Cliente',
                phone: customer.phone || '',
                status: 'active',
                plan: payload.data.product?.name || 'Assinatura Lead Miner',
                updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log(`👤 User automatically created/updated: ${email}`);
            return res.status(200).json({ success: true, message: 'User provisioned' });
        }

        // Se for outro evento (ex: pix_generated), apenas confirmamos
        return res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        return res.status(500).send('Internal Server Error');
    }
});

// Check session
app.get('/api/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ authenticated: true, user: req.session.user.username });
    }
    return res.status(401).json({ authenticated: false });
});

// ========================================
// PROTECT ALL ROUTES BELOW
// ========================================
app.use(requireAuth);

// Serve static files (only for authenticated users)
app.use(express.static(path.join(__dirname, 'public')));

// ========================================
// PROTECTED API ROUTES
// ========================================

// Endpoint to trigger lead extraction
app.post('/api/extract-leads', async (req, res) => {
    try {
        const { niche, city, state, radius, limit, extraKeywords } = req.body;

        if (!niche || !city || !state) {
            return res.status(400).json({ error: 'Niche, city and state are required.' });
        }

        const user = req.session.user?.username || 'unknown';
        console.log(`[${user}] Starting extraction for ${niche} in ${city} - ${state}...`);

        // 1. Fetch leads from Google Places API
        const leads = await searchLeads({ niche, city, state, radius, limit, extraKeywords });

        console.log(`[${user}] Extraction finished. Found ${leads.length} leads.`);

        // 2. Save results to Google Sheet
        if (leads.length > 0) {
            await saveToSheet(leads);
            console.log(`[${user}] Successfully saved to Google Sheets.`);
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
    const users = getUsers();
    console.log(`Lead Miner API running on port ${PORT}`);
    console.log(`🔐 Auth enabled — ${Object.keys(users).length} user(s) configured`);
});

// Export for Vercel Serverless
module.exports = app;
