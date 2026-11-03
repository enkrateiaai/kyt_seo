// The confirmation mail for a webinar registration. Kept separate from the
// API route so the wording can be changed without touching the flow.

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

export function formatSlotDate(startsAt: string | null): string {
  if (!startsAt) return '—'
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return '—'
  return `${dateFormatter.format(date)} um ${timeFormatter.format(date)} Uhr`
}

export function buildRegistrationMail(options: {
  slot: WebinarConfig
  link: string
  unsubscribeUrl: string
}): { subject: string; html: string; text: string } {
  const { slot, link, unsubscribeUrl } = options
  const title = slot.title || 'Soul Path Webinar'
  const when = formatSlotDate(slot.startsAt)

  const subject = `Dein Termin ist reserviert: ${title} am ${when}`

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2A1F1A; background: #FAF7F2;">
      <p style="font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: #C9A96E; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
      <h1 style="font-size: 28px; font-weight: 400; line-height: 1.3; margin: 0 0 24px;">Dein Webinar-Termin steht</h1>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 8px;">${title}</p>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 28px; font-weight: 600;">${when}</p>
      <div style="margin: 0 0 28px;">
        <a href="${link}" style="display: inline-block; background: #D3BC76; color: #2A1F1A; text-decoration: none; padding: 15px 34px; border-radius: 999px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600;">
          Zum Webinar
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.75; color: #6B5D4F; margin: 0 0 8px;">
        Bitte öffne deinen Termin-Link. Das Video ist ausschließlich während des geplanten
        Termins abrufbar - vorher und danach gibt es nichts zu schauen.
      </p>
      <p style="font-size: 14px; line-height: 1.75; color: #6B5D4F; margin: 0 0 24px;">
        Falls der Link nicht funktioniert, kopiere ihn direkt in deinen Browser:
      </p>
      <p style="font-size: 13px; line-height: 1.7; color: #8A7B72; margin: 0 0 28px; word-break: break-all;">${link}</p>
      <hr style="border: none; border-top: 1px solid #E8DDD0; margin: 28px 0;">
      <p style="font-size: 12px; line-height: 1.7; color: #8A7B72; margin: 0 0 6px;">
        Kundalini Yoga Tribe · kundaliniyogatribe.de
      </p>
      <p style="font-size: 11px; line-height: 1.7; color: #A99A8E; margin: 0;">
        Keine weiteren Mails gewünscht? <a href="${unsubscribeUrl}" style="color: #A99A8E; text-decoration: underline;">Hier abmelden</a>
      </p>
    </div>
  `

  const text = [
    `Dein Webinar-Termin steht`,
    '',
    title,
    when,
    '',
    `Zum Webinar: ${link}`,
    '',
    'Bitte öffne deinen Termin-Link. Das Video ist ausschließlich während des',
    'geplanten Termins abrufbar - vorher und danach gibt es nichts zu schauen.',
    '',
    'Kundalini Yoga Tribe · kundaliniyogatribe.de',
    `Keine weiteren Mails gewünscht? ${unsubscribeUrl}`,
  ].join('\n')

  return { subject, html, text }
}
