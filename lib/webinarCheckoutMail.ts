const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kundaliniyogatribe.de'

export function buildWebinarCheckoutMail(options: {
  name: string
  email: string
  token: string
}): { subject: string; html: string; text: string } {
  const { name, token } = options
  const link = `${SITE_URL}/webinar?token=${token}`
  const displayName = name.split(' ')[0] || name

  const subject = 'Dein AI Webinar-Zugang – Kundalini Yoga Tribe'

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2A1F1A; background: #FAF7F2;">
      <p style="font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: #C9A96E; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
      <h1 style="font-size: 28px; font-weight: 400; line-height: 1.3; margin: 0 0 20px;">Herzlich Willkommen, ${displayName}</h1>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 8px;">Deine Zahlung ist eingegangen.</p>
      <p style="font-size: 16px; line-height: 1.75; color: #4A3728; margin: 0 0 28px;">Hier ist dein persönlicher Zugang zum <strong>AI Webinar</strong>:</p>
      <div style="margin: 0 0 28px;">
        <a href="${link}" style="display: inline-block; background: #D3BC76; color: #2A1F1A; text-decoration: none; padding: 15px 34px; border-radius: 999px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600;">
          AI Webinar öffnen
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.75; color: #6B5D4F; margin: 0 0 8px;">
        Dieser Link gehört nur dir – teile ihn nicht weiter. Du kannst ihn jederzeit wieder aufrufen,
        sobald ein Webinar-Termin geplant ist.
      </p>
      <p style="font-size: 14px; line-height: 1.75; color: #6B5D4F; margin: 0 0 24px;">
        Falls der Link nicht funktioniert, kopiere ihn direkt in deinen Browser:
      </p>
      <p style="font-size: 13px; line-height: 1.7; color: #8A7B72; margin: 0 0 28px; word-break: break-all;">${link}</p>
      <hr style="border: none; border-top: 1px solid #E8DDD0; margin: 28px 0;">
      <p style="font-size: 12px; line-height: 1.7; color: #8A7B72; margin: 0;">
        Kundalini Yoga Tribe · kundaliniyogatribe.de
      </p>
    </div>
  `

  const text = [
    `Herzlich Willkommen, ${displayName}`,
    '',
    'Deine Zahlung ist eingegangen.',
    'Hier ist dein persönlicher Zugang zum AI Webinar:',
    '',
    link,
    '',
    'Dieser Link gehört nur dir – teile ihn nicht weiter.',
    'Du kannst ihn jederzeit wieder aufrufen, sobald ein Webinar-Termin geplant ist.',
    '',
    'Kundalini Yoga Tribe · kundaliniyogatribe.de',
  ].join('\n')

  return { subject, html, text }
}
