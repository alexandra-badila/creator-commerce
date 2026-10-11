import 'server-only'

import nodemailer from 'nodemailer'

/**
 * One transporter, chosen once at module load.
 *
 * Credentials decide it, first hit wins: RESEND_API_KEY means Resend,
 * SMTP_USER and SMTP_PASS together mean Gmail, neither means the console. A
 * fresh clone with no .env therefore logs instead of throwing, and nothing
 * sends real mail from a dev machine unless someone deliberately pasted real
 * credentials. The accepted cost is that a typo'd variable name in production
 * degrades to console silently.
 *
 * Every branch is a nodemailer transporter, which is the point. jsonTransport
 * builds the complete message and hands it back instead of opening a socket, so
 * sendEmail calls sendMail identically either way and never branches on
 * transport.
 *
 * Not pooled. The SMTP handshake costs 1-3s inside a webhook Stripe is timing,
 * and TODO.md already names the outbox as the fix for that; pooling a connection
 * in a per-invocation serverless function would be a false one.
 *
 * Resend goes over its SMTP relay rather than its SDK, so it is one more
 * nodemailer profile and not a second code path: the username is literally
 * "resend" and the password is the API key. Resend sends only from a domain
 * verified on the account; without one, onboarding@resend.dev delivers to the
 * account owner's own address and nowhere else.
 *
 * service: 'gmail' resolves host, port and TLS from nodemailer's built-in
 * profile. SMTP_PASS is a Google App Password, which requires 2FA on the
 * account — a normal password will be rejected.
 */
const resendKey = process.env.RESEND_API_KEY
const hasGmail = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

export const hasCredentials = Boolean(resendKey) || hasGmail

// || rather than ??: .env.example ships `EMAIL_FROM=`, and an empty string
// would otherwise win over the fallback and send with a blank From.
export const emailFrom =
  process.env.EMAIL_FROM ||
  (resendKey ? 'onboarding@resend.dev' : process.env.SMTP_USER) ||
  'dev@localhost'

export const transporter = resendKey
  ? nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: resendKey },
    })
  : hasGmail
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : nodemailer.createTransport({ jsonTransport: true })
