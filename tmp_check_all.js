const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkAll() {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => doc.data());
    console.log(`Encontrados ${users.length} usuários:`);
    users.forEach(u => console.log(`- ${u.email}`));
    process.exit(0);
}
checkAll();
