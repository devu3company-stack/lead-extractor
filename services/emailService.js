const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Gmail App Password
    }
});

/**
 * Send welcome email to new user provisioned via Cakto
 */
async function sendWelcomeEmail({ toEmail, name, password, loginUrl }) {
    const firstName = (name || 'Cliente').split(' ')[0];
    const subject = '🚀 Seu acesso ao Lead Miner está pronto!';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acesso ao Lead Miner</title>
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
              <p style="color:#FFF600;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Olá, ${firstName}! 👋</p>
              <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 16px;line-height:1.3;">
                Seu acesso está <span style="color:#FFF600;">liberado</span>!
              </h1>
              <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 32px;">
                Sua assinatura do <strong style="color:#fff;">Lead Miner</strong> foi confirmada com sucesso. Agora você pode extrair leads qualificados do Google Maps em segundos, direto no seu painel.
              </p>

              <!-- CREDENTIALS BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,246,0,0.05);border:1px solid rgba(255,246,0,0.2);border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:#a1a1aa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Suas credenciais de acesso</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#666;font-size:12px;display:block;margin-bottom:4px;">E-MAIL</span>
                          <span style="color:#ffffff;font-size:15px;font-weight:600;">${toEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="color:#666;font-size:12px;display:block;margin-bottom:4px;">SENHA INICIAL</span>
                          <span style="color:#FFF600;font-size:18px;font-weight:800;letter-spacing:1px;">${password}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background:#FFF600;color:#000000;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:800;font-size:15px;text-transform:uppercase;letter-spacing:1px;">
                      ⚡ Acessar o Lead Miner
                    </a>
                  </td>
                </tr>
              </table>

              <!-- TIP -->
              <p style="color:#555;font-size:13px;text-align:center;margin:24px 0 0;line-height:1.6;">
                💡 Recomendamos alterar sua senha após o primeiro acesso.<br>
                Dúvidas? Fale conosco no WhatsApp ou responda este e-mail.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="text-align:center;padding-top:28px;">
              <p style="color:#333;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} U3 Company · Lead Miner<br>
                Você recebeu este e-mail porque realizou uma compra em nossa plataforma.
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
            to: toEmail,
            subject,
            html
        });
        console.log(`📧 Welcome email sent to: ${toEmail}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to send email to ${toEmail}:`, err.message);
        return false;
    }
}

module.exports = { sendWelcomeEmail };
