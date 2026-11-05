// The 15-minute reminder mail for a booked webinar seat.
// Kept in its own file so the registration mail (lib/webinarMail.ts) stays untouched.

import { WebinarConfig } from './webinarSchedule'

const TIME_ZONE = 'Europe/Berlin'

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

export function formatReminderDate(startsAt: string | null): string {
  if (!startsAt) return '—'
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return '—'
  return `${dateFormatter.format(date)} um ${timeFormatter.format(date)} Uhr`
}

// The name comes from the registration form, so it is treated as untrusted
// text and escaped before it goes into the mail body.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Only the first name is used for the greeting.
export function firstName(raw: string | null | undefined): string {
  if (!raw) return ''
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const parts = cleaned.split(' ')
  const first = parts[0] || ''
  if (first.length > 40) return ''
  return escapeHtml(first)
}

export function buildReminderMail(options: {
  slot: WebinarConfig
  link: string
  minutes: number
  name?: string
}): { subject: string; html: string; text: string } {
  const { slot, link, minutes } = options
  const title = slot.title || 'Soul Path Webinar'
  const when = formatReminderDate(slot.startsAt)
  const greeting = firstName(options.name)
  const subject = `Dein Webinar startet in ${minutes} Minuten: ${title}`

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2A1F1A; background: #FAF7F2;">
      <p style="font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: #C9A96E; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
      <h1 style="font-size: 28px; font-weight: 400; line-height: 1.3; margin: 0 0 24px;">${greeting ? `Hallo ${greeting}, dein Webinar startet gleich` : 'Dein Webinar startet gleich'}</h1>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 8px;">${title}</p>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 28px; font-weight: 600;">${when}</p>
      <div style="margin: 0 0 28px;">
        <a href="${link}" style="display: inline-block; background: #D3BC76; color: #2A1F1A; text-decoration: none; padding: 15px 34px; border-radius: 999px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600;">
          Webinar öffnen
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.8; color: #6B5A4C; margin: 0 0 6px;">Bitte 2–3 Minuten vorher öffnen und den Ton aktivieren.</p>
      <p style="font-size: 13px; line-height: 1.7; color: #8A7B72; margin: 0 0 28px; word-break: break-all;">${link}</p>
      <p style="font-size: 13px; line-height: 1.7; color: #8A7B72; margin: 0 0 24px;">Der Zugang ist nur während des Termins verfügbar.</p>
      <p style="font-size: 12px; line-height: 1.6; color: #A79A8E; margin: 0;">Kundalini Yoga Tribe</p>
    </div>
  `

  const text = [
    greeting ? `Hallo ${greeting}, dein Webinar startet in ${minutes} Minuten.` : `Dein Webinar startet in ${minutes} Minuten.`,
    '',
    `${title}`,
    `${when}`,
    '',
    `Link: ${link}`,
    '',
    'Bitte 2–3 Minuten vorher öffnen und den Ton aktivieren.',
    'Der Zugang ist nur während des Termins verfügbar.',
  ].join('\n')

  return { subject, html, text }
}
