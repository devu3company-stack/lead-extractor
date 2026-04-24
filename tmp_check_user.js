const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkUser() {
    const email = 'capitalizzebrasil@gmail.com';
    try {
        const doc = await db.collection('users').doc(email).get();
        if (doc.exists) {
            console.log('✅ Usuário encontrado no Firestore:');
            console.log(JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('❌ Usuário NÃO encontrado no Firestore!');
        }
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

checkUser();
