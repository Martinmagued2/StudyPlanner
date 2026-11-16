import nodemailer from 'nodemailer';

export function isGmailSmtpConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendViaGmailSmtp(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; id?: string; error?: string; retries: number; configured: boolean }> {
  const user = (process.env.GMAIL_USER || '').trim();
  const rawPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();

  if (!user || !rawPass) {
    return {
      ok: false,
      configured: false,
      retries: 0,
      error:
        'GMAIL_USER or GMAIL_APP_PASSWORD is missing in server environment variables.'
    };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass: rawPass
    }
  });

  const fromName = process.env.GMAIL_FROM_NAME || 'Nook StudyPlanner';
  let lastError = 'Unknown Gmail SMTP error';
  let retries = 0;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${user}>`,
        to,
        subject,
        html
      });
      return {
        ok: true,
        configured: true,
        id: info.messageId,
        retries
      };
    } catch (err: any) {
      lastError = err?.message || 'Failed to send email via Gmail SMTP';
      retries = attempt;
    }
  }

  return {
    ok: false,
    configured: true,
    error: lastError,
    retries
  };
}

