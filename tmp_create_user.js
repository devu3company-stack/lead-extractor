const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function createAdmin() {
    try {
        await db.collection('users').doc('baoderir@gmail.com').set({
            password: 'baoderir2026',
            name: 'Baoderir',
            email: 'baoderir@gmail.com',
            status: 'active',
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Usuário "baoderir@gmail.com" criado com sucesso no Firestore!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error.message);
        process.exit(1);
    }
}

createAdmin();
