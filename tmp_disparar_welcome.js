require('dotenv').config();
const admin = require('firebase-admin');
const { sendWelcomeEmail } = require('./services/emailService');

// 1. Iniciando o Firebase
const serviceAccount = require('./firebase-service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function dispararAcessos() {
    try {
        console.log("🔍 Buscando usuários no Firestore...");
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => doc.data());
        console.log(`✅ Encontrados ${users.length} usuários.`);

        let successCount = 0;
        let errorCount = 0;
        const loginUrl = process.env.APP_URL || 'https://ldextractor.u3company.com/login.html';

        for (const user of users) {
             if (!user.email || !user.password) {
                 console.log(`⚠️ Ignorando usuário sem email/senha...`);
                 continue;
             }

            try {
                const success = await sendWelcomeEmail({
                    toEmail: user.email,
                    name: user.name || 'Cliente',
                    password: user.password,
                    loginUrl: loginUrl
                });
                
                if (success) {
                   successCount++;
                } else {
                   errorCount++;
                }

            } catch (err) {
                console.error(`❌ Erro ao enviar para ${user.email}:`, err.message);
                errorCount++;
            }
            
            // Pausa de 1s para evitar Rate Limit
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`\n🎉 Disparo finalizado! Sucesso: ${successCount} | Erros: ${errorCount}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no disparo:', error);
        process.exit(1);
    }
}

dispararAcessos();
