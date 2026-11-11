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

// The end of the access window - used when the webinar is on demand and
// therefore has no fixed start time.
export function formatAccessUntil(endsAt: string | null): string {
  if (!endsAt) return '—'
  const date = new Date(endsAt)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
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
  // On demand: the webinar is not a live session but a video that stays
  // available for a window of time. Then there is no start time to count
  // down to - the mail says how long the access lasts instead.
  onDemand?: boolean
}): { subject: string; html: string; text: string } {
  const { slot, link, minutes } = options
  const onDemand = options.onDemand === true
  const title = slot.title || 'Soul Path Webinar'
  const greeting = firstName(options.name)
  const subject = onDemand
    ? `Dein Webinar-Zugang: ${title}`
    : `Dein Webinar startet in ${minutes} Minuten: ${title}`

  const when = onDemand ? formatAccessUntil(slot.endsAt) : formatReminderDate(slot.startsAt)
  const heading = onDemand
    ? (greeting ? `Hallo ${greeting}, dein Webinar-Zugang ist offen` : 'Dein Webinar-Zugang ist offen')
    : (greeting ? `Hallo ${greeting}, dein Webinar startet gleich` : 'Dein Webinar startet gleich')

  const cta = onDemand ? 'Webinar ansehen' : 'Webinar öffnen'
  const hint = onDemand
    ? 'Dein Video ist sofort verfügbar - schau es dir in Ruhe an.'
    : 'Bitte 2–3 Minuten vorher öffnen und den Ton aktivieren.'
  const accessNote = onDemand
    ? `Dein Zugang ist bis ${when} verfügbar.`
    : 'Der Zugang ist nur während des Termins verfügbar.'

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2A1F1A; background: #FAF7F2;">
      <p style="font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: #C9A96E; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
      <h1 style="font-size: 28px; font-weight: 400; line-height: 1.3; margin: 0 0 24px;">${heading}</h1>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 8px;">${title}</p>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 28px; font-weight: 600;">${when}</p>
      <div style="margin: 0 0 28px;">
        <a href="${link}" style="display: inline-block; background: #D3BC76; color: #2A1F1A; text-decoration: none; padding: 15px 34px; border-radius: 999px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600;">
          ${cta}
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.8; color: #6B5A4C; margin: 0 0 6px;">${hint}</p>
      <p style="font-size: 13px; line-height: 1.7; color: #8A7B72; margin: 0 0 28px; word-break: break-all;">${link}</p>
      <p style="font-size: 13px; line-height: 1.7; color: #8A7B72; margin: 0 0 24px;">${accessNote}</p>
      <p style="font-size: 12px; line-height: 1.6; color: #A79A8E; margin: 0;">Kundalini Yoga Tribe</p>
    </div>
  `

  const text = [
    onDemand
      ? (greeting ? `Hallo ${greeting}, dein Webinar-Zugang ist offen.` : 'Dein Webinar-Zugang ist offen.')
      : (greeting ? `Hallo ${greeting}, dein Webinar startet in ${minutes} Minuten.` : `Dein Webinar startet in ${minutes} Minuten.`),
    '',
    `${title}`,
    `${when}`,
    '',
    `Link: ${link}`,
    '',
    hint,
    accessNote,
  ].join('\n')

  return { subject, html, text }
}
