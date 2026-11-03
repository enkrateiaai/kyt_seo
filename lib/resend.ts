// Minimal Resend client for transactional mail (currently the webinar
// registration confirmation). The API key never leaves the server: it is
// read from the runtime environment and never exposed to the browser.

type SendOptions = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'info@kundaliniyogatribe.de'
}

export function getResendFromName(): string {
  return process.env.RESEND_FROM_NAME?.trim() || 'Kundalini Yoga Tribe'
}

export function getResendReplyTo(): string {
  return process.env.RESEND_REPLY_TO_EMAIL?.trim() || 'info@kundaliniyogatribe.de'
}

export async function sendResendEmail(options: SendOptions): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY fehlt' }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${getResendFromName()} <${getResendFromEmail()}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo || getResendReplyTo(),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!response.ok) {
      return { ok: false, error: data.message || `Resend HTTP ${response.status}` }
    }
    return { ok: true, id: data.id || '' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' }
  }
}
