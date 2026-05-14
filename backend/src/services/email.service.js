// Trimitere de email-uri prin SMTP (Nodemailer).
// Credentialele SMTP vin din .env (vezi README). Adresa "From" este SMTP_USER
// din .env — head admin controleaza doar dacă verificarea e activă, via toggle-ul
// `bypassEmailVerification` din SystemConfig.
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host   = process.env.SMTP_HOST;
  const port   = Number(process.env.SMTP_PORT) || 587;
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    throw new Error('SMTP nu este configurat (lipsesc SMTP_HOST/SMTP_USER/SMTP_PASS in .env)');
  }

  transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
  });
  return transporter;
}

function getFromEmail() {
  const from = process.env.SMTP_USER?.trim();
  if (!from) throw new Error('SMTP_USER nu este configurat în .env — nu pot stabili adresa de trimitere');
  return from;
}

// Trimite emailul cu link de verificare. Aruncă dacă SMTP nu e configurat.
export async function sendVerificationEmail({ to, username, token, frontendUrl }) {
  const fromEmail = getFromEmail();

  const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #6b21a8;">Bine ai venit pe Notițe!</h2>
      <p>Salut <strong>${username}</strong>,</p>
      <p>Ca să poți folosi contul, trebuie mai întâi să confirmi adresa de email:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background: linear-gradient(135deg, #a855f7, #3b82f6); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Confirmă emailul
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Sau copiază acest link în browser:<br>
        <a href="${verifyUrl}" style="color: #6b21a8; word-break: break-all;">${verifyUrl}</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Linkul expiră în 24 de ore. Dacă nu te-ai înregistrat tu, ignoră acest email.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: fromEmail,
    to,
    subject: 'Confirmă-ți emailul — Notițe',
    html,
    text: `Salut ${username}, confirmă-ți emailul accesând: ${verifyUrl}`,
  });
}

// Trimite emailul pentru verificarea unui dispozitiv nou de admin.
export async function sendDeviceVerificationEmail({ to, username, token, frontendUrl, userAgent, ipAddress }) {
  const fromEmail = getFromEmail();

  const verifyUrl = `${frontendUrl}/verify-device?token=${encodeURIComponent(token)}`;
  const when = new Date().toLocaleString('ro-RO');

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #6b21a8;">Confirmare acces admin</h2>
      <p>Salut <strong>${username}</strong>,</p>
      <p>S-a încercat autentificarea în contul tău <strong>de pe un dispozitiv nou</strong> (sau pe care nu te-ai mai logat de ceva timp).</p>
      <p style="margin: 0 0 4px;"><strong>Data:</strong> ${when}</p>
      <p style="margin: 0 0 4px;"><strong>IP:</strong> ${ipAddress || 'necunoscut'}</p>
      <p style="margin: 0 0 16px;"><strong>Browser:</strong> ${userAgent || 'necunoscut'}</p>
      <p>Dacă tu ai fost, confirmă dispozitivul de aici:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background: linear-gradient(135deg, #a855f7, #3b82f6); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Confirmă dispozitivul
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Sau copiază acest link în browser:<br>
        <a href="${verifyUrl}" style="color: #6b21a8; word-break: break-all;">${verifyUrl}</a>
      </p>
      <p style="color: #b91c1c; font-size: 13px; margin-top: 24px;">
        Dacă <strong>nu</strong> ai fost tu, ignoră emailul și schimbă-ți parola imediat.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 12px;">
        Linkul expiră în 24 de ore.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: fromEmail,
    to,
    subject: 'Confirmă accesul de pe un dispozitiv nou — Notițe',
    html,
    text: `Salut ${username}, confirmă accesul de pe dispozitivul nou: ${verifyUrl}`,
  });
}
