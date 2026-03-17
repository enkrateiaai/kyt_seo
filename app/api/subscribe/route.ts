import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import redis from '@/lib/redis'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
  }

  const apiKey = process.env.MAILJET_API_KEY?.trim()
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim()
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim() || 'noreply@kundaliniyogatribe.de'
  const siteUrl = 'https://kundaliniyogatribe.de'

  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: 'Konfigurationsfehler' }, { status: 500 })
  }

  // Check if already confirmed
  const existing = await redis.get(`confirmed:${email}`)
  if (existing) {
    return NextResponse.json({ success: true, already: true })
  }

  // Generate confirm token (24h) + unsubscribe token (1 year)
  const token = randomBytes(32).toString('hex')
  const unsubToken = randomBytes(32).toString('hex')
  await redis.setex(`doi:${token}`, 86400, email)
  await redis.setex(`unsub:${unsubToken}`, 31536000, email) // 1 year

  const confirmUrl = `${siteUrl}/api/confirm?token=${token}`
  const unsubUrl = `${siteUrl}/api/unsubscribe?token=${unsubToken}`

  // Send confirmation email via Mailjet
  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')
  try {
    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: fromEmail, Name: 'Kundalini Yoga Tribe' },
          To: [{ Email: email }],
          Subject: 'Bitte bestätige deine Anmeldung 🙏',
          HTMLPart: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2C2416;">
              <p style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #D3BC76; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
              <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 24px;">Fast fertig — bestätige deine Anmeldung</h1>
              <p style="font-size: 16px; line-height: 1.7; color: #6B5D4F;">Du hast dich für unseren Newsletter angemeldet. Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und Kriyas, Meditationen und Impulse zu erhalten.</p>
              <div style="margin: 32px 0;">
                <a href="${confirmUrl}" style="display: inline-block; background: #D3BC76; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 100px; font-family: sans-serif; font-size: 15px; font-weight: 500;">
                  Ja, ich möchte dabei sein →
                </a>
              </div>
              <p style="font-size: 13px; color: #9B8E7E; line-height: 1.6;">Wenn du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren. Der Link ist 24 Stunden gültig.</p>
              <hr style="border: none; border-top: 1px solid #EDE8E0; margin: 32px 0;">
              <p style="font-size: 12px; color: #9B8E7E;">kundaliniyogatribe.de · Sat Nam Rasayan & Kundalini Kriyas</p>
              <p style="font-size: 11px; color: #B0A090; margin-top: 8px;">
                Du möchtest keinen Newsletter? <a href="${unsubUrl}" style="color: #B0A090; text-decoration: underline;">Hier abmelden</a>
              </p>
            </div>
          `,
          TextPart: `Bitte bestätige deine Anmeldung:\n\n${confirmUrl}\n\nDer Link ist 24 Stunden gültig.\n\nAbmelden: ${unsubUrl}`,
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Mailjet send error:', res.status, err)
      return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Subscribe error:', e)
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 })
  }
}
