const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fix() {
    // Delete `undefined` and uppercase `Gladygold_1894@hotmail.com`
    console.log('Cleaning up invalid docs...');
    await db.collection('users').doc('undefined').delete().catch(()=>console.log('No undefined to delete'));
    await db.collection('users').doc('Gladygold_1894@hotmail.com').delete().catch(()=>console.log('No Gladygold to delete'));

    // The users list:
    const users = [
        { email: 'gladygold_1894@hotmail.com', password: 'admin123', name: 'Cliente' },
        { email: 'baoderir@gmail.com', password: 'baoderir2026', name: 'Baoderir' },
        { email: 'capitalizzebrasil@gmail.com', password: 'admin123', name: 'Capitalizze' },
        { email: 'robsonfelix03@gmail.com', password: 'admin123', name: 'Robson' },
        { email: 'admin', password: 'admin123', name: 'Admin' }
    ];

    for (const u of users) {
        await db.collection('users').doc(u.email).set({
            password: u.password,
            email: u.email,
            name: u.name,
            status: 'active',
            updatedAt: new Date().toISOString()
        });
        console.log(`✅ ${u.email} criado no FIRESTORE DATABASE.`);
    }

    process.exit(0);
}
fix();
