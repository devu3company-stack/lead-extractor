require('dotenv').config();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// 1. Iniciando o Firebase
const serviceAccount = require('./firebase-service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. Iniciando o NodeMailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function dispararEmailAtualizacao() {
    try {
        console.log("🔍 Buscando usuários no Firestore...");
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => doc.data());
        console.log(`✅ Encontrados ${users.length} usuários.`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            if (!user.email) continue;
            
            const firstName = (user.name || 'Cliente').split(' ')[0];
            const subject = '⚠️ Atualização Importante: Mudança no Sistema de Login do Lead Miner';
            
            const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atualização de Acesso ao Lead Miner</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- HEADER -->
          <tr>
            <td style="text-align:center;padding-bottom:32px;">
              <span style="font-size:28px;font-weight:900;color:#FFF600;letter-spacing:-1px;">⛏ Lead Miner</span>
              <p style="margin:4px 0 0;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:3px;">U3 Company</p>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0f0f,#1a1a00);border:1px solid rgba(255,246,0,0.2);border-radius:20px;padding:40px;">

              <!-- GREETING -->
              <p style="color:#FFF600;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Olá, ${firstName}!</p>
              <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 16px;line-height:1.3;">
                Mudamos nosso sistema de <span style="color:#FFF600;">login</span>!
              </h1>
              <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 32px;">
                Para melhorar sua segurança e experiência na plataforma, nosso sistema de autenticação foi atualizado. 
                Seu acesso continua garantido, mas você precisará definir uma nova senha no seu próximo acesso.
              </p>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.APP_URL || 'https://ldextractor.u3company.com/login.html'}" style="display:inline-block;background:#FFF600;color:#000000;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:800;font-size:15px;text-transform:uppercase;letter-spacing:1px;">
                      ⚡ Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>

              <!-- TIP -->
              <p style="color:#555;font-size:13px;text-align:center;margin:24px 0 0;line-height:1.6;">
                Basta clicar em "Esqueci minha senha" na tela de login para cadastrar uma nova senha.<br>
                Qualquer dúvida, nossa equipe de suporte está à disposição.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="text-align:center;padding-top:28px;">
              <p style="color:#333;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} U3 Company · Lead Miner
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

            try {
                await transporter.sendMail({
                    from: `"Lead Miner · U3 Company" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject,
                    html
                });
                console.log(`📧 E-mail enviado com sucesso para: ${user.email}`);
                successCount++;
            } catch (err) {
                console.error(`❌ Erro ao enviar para ${user.email}:`, err.message);
                errorCount++;
            }
            
            // Pausa de 1s para não sobrecarregar o SMTP (Rate limit)
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`\n🎉 Disparo finalizado! Sucesso: ${successCount} | Erros: ${errorCount}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no disparo:', error);
        process.exit(1);
    }
}

dispararEmailAtualizacao();
