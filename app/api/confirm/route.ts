import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import redis from '@/lib/redis'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const siteUrl = 'https://kundaliniyogatribe.de'
  const shopUrl = 'https://www.charan-amrit-kaur.de/yoga-tribe/'

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
  }

  const email = await redis.get(`doi:${token}`)

  if (!email) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=abgelaufen`)
  }

  const lang = (await redis.get(`doi_lang:${token}`)) || 'de'

  const apiKey = process.env.MAILJET_API_KEY?.trim()
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim()
  const listId = process.env.MAILJET_LIST_ID?.trim()
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim() || 'info@kundaliniyogatribe.de'

  if (!apiKey || !secretKey || !listId) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')

    // 1. Add to Mailjet contact list
    const res = await fetch(`https://api.mailjet.com/v3/REST/contactslist/${listId}/managecontact`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Email: email, Action: 'addnoforce' }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Mailjet confirm error:', res.status, err)
      return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
    }

    // 2. Mark as confirmed, delete token; create/retrieve unsubscribe token
    await redis.setex(`confirmed:${email}`, 2592000, '1') // 30 days
    await redis.del(`doi:${token}`)

    // Generate a persistent unsubscribe token for this email (or reuse existing)
    let unsubToken = await redis.get(`unsub_for:${email}`)
    if (!unsubToken) {
      unsubToken = randomBytes(32).toString('hex')
      await redis.setex(`unsub:${unsubToken}`, 31536000, email) // 1 year
      await redis.setex(`unsub_for:${email}`, 31536000, unsubToken)
    }
    const unsubUrl = `${siteUrl}/api/unsubscribe?token=${unsubToken}`

    // 3. Send welcome email (fire-and-forget — don't block redirect on failure)
    const welcomeSubject = lang === 'en' ? 'Welcome to the Kundalini Yoga Tribe' : 'Willkommen im Kundalini Yoga Tribe'
    const welcomeHtml = lang === 'en' ? `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2C2416;">
        <p style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #D3BC76; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
        <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 20px; line-height: 1.25;">Sat Nam — you're in</h1>
        <p style="font-size: 16px; line-height: 1.8; color: #6B5D4F; margin-bottom: 24px;">
          Great to have you here. A few starting points for your Kundalini journey:
        </p>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-bottom: 28px;">
          <tr>
            <td style="background: #F3EDE4; border: 1px solid #EDE8E0; border-radius: 10px; padding: 16px 20px;">
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 6px; font-family: sans-serif;">Introduction</p>
              <p style="font-size: 16px; color: #2C2416; margin: 0 0 6px;">What is Kundalini Yoga?</p>
              <p style="font-size: 13px; color: #9B8E7E; margin: 0 0 12px; line-height: 1.5;">Effects, Kriyas and how to begin — a complete introduction.</p>
              <a href="${siteUrl}/artikel/was-ist-kundalini-yoga" style="font-family: sans-serif; font-size: 13px; font-weight: 500; color: #D3BC76; text-decoration: none;">Read article →</a>
            </td>
          </tr>
          <tr>
            <td style="background: #F3EDE4; border: 1px solid #EDE8E0; border-radius: 10px; padding: 16px 20px;">
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 6px; font-family: sans-serif;">First Kriya</p>
              <p style="font-size: 16px; color: #2C2416; margin: 0 0 6px;">Sat Kriya — the most important practice</p>
              <p style="font-size: 13px; color: #9B8E7E; margin: 0 0 12px; line-height: 1.5;">3 minutes a day that can change everything. Step-by-step guide.</p>
              <a href="${siteUrl}/artikel/sat-kriya-anleitung" style="font-family: sans-serif; font-size: 13px; font-weight: 500; color: #D3BC76; text-decoration: none;">See guide →</a>
            </td>
          </tr>
          <tr>
            <td style="background: #F3EDE4; border: 1px solid #EDE8E0; border-radius: 10px; padding: 16px 20px;">
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 6px; font-family: sans-serif;">Videos</p>
              <p style="font-size: 16px; color: #2C2416; margin: 0 0 6px;">Kriyas & Meditations to practise along</p>
              <p style="font-size: 13px; color: #9B8E7E; margin: 0 0 12px; line-height: 1.5;">Guided Kriyas — the first video of each playlist is free.</p>
              <a href="${siteUrl}/videos" style="font-family: sans-serif; font-size: 13px; font-weight: 500; color: #D3BC76; text-decoration: none;">Go to video library →</a>
            </td>
          </tr>
        </table>
        <div style="background: #2C2416; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; text-align: center;">
          <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 8px; font-family: sans-serif;">Membership</p>
          <p style="font-size: 20px; font-weight: 300; color: #FAF7F2; margin: 0 0 10px;">Unlimited access to all Kriyas</p>
          <p style="font-size: 14px; color: #9B8E7E; margin: 0 0 20px; line-height: 1.6;">As a member you get full access to all videos, live sessions and new content.</p>
          <a href="${shopUrl}" style="display: inline-block; background: #D3BC76; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 100px; font-family: sans-serif; font-size: 14px; font-weight: 500;">
            Become a member →
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #EDE8E0; margin: 28px 0;">
        <p style="font-size: 12px; color: #9B8E7E;">kundaliniyogatribe.de · Sat Nam Rasayan & Kundalini Kriyas</p>
        <p style="font-size: 11px; color: #B0A090; margin-top: 8px;">
          Don't want emails? <a href="${unsubUrl}" style="color: #B0A090; text-decoration: underline;">Unsubscribe here</a>
        </p>
      </div>
    ` : `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2C2416;">
        <p style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #D3BC76; margin-bottom: 8px;">Kundalini Yoga Tribe</p>
        <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 20px; line-height: 1.25;">Sat Nam — du bist dabei</h1>
        <p style="font-size: 16px; line-height: 1.8; color: #6B5D4F; margin-bottom: 24px;">
          Schön, dass du dabei bist. Hier findest du deine ersten Schritte in die Welt des Kundalini Yoga:
        </p>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-bottom: 28px;">
          <tr>
            <td style="background: #F3EDE4; border: 1px solid #EDE8E0; border-radius: 10px; padding: 16px 20px;">
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 6px; font-family: sans-serif;">Einstieg</p>
              <p style="font-size: 16px; color: #2C2416; margin: 0 0 6px;">Was ist Kundalini Yoga?</p>
              <p style="font-size: 13px; color: #9B8E7E; margin: 0 0 12px; line-height: 1.5;">Wirkung, Kriyas und wie du beginnst — eine vollständige Einführung.</p>
              <a href="${siteUrl}/artikel/was-ist-kundalini-yoga" style="font-family: sans-serif; font-size: 13px; font-weight: 500; color: #D3BC76; text-decoration: none;">Artikel lesen →</a>
            </td>
          </tr>
          <tr>
            <td style="background: #F3EDE4; border: 1px solid #EDE8E0; border-radius: 10px; padding: 16px 20px;">
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 6px; font-family: sans-serif;">Erste Kriya</p>
              <p style="font-size: 16px; color: #2C2416; margin: 0 0 6px;">Sat Kriya — die wichtigste Übung</p>
              <p style="font-size: 13px; color: #9B8E7E; margin: 0 0 12px; line-height: 1.5;">3 Minuten täglich, die alles verändern können. Mit Schritt-für-Schritt-Anleitung.</p>
              <a href="${siteUrl}/artikel/sat-kriya-anleitung" style="font-family: sans-serif; font-size: 13px; font-weight: 500; color: #D3BC76; text-decoration: none;">Zur Anleitung →</a>
            </td>
          </tr>
          <tr>
            <td style="background: #F3EDE4; border: 1px solid #EDE8E0; border-radius: 10px; padding: 16px 20px;">
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 6px; font-family: sans-serif;">Videos</p>
              <p style="font-size: 16px; color: #2C2416; margin: 0 0 6px;">Kriyas & Meditationen zum Mitmachen</p>
              <p style="font-size: 13px; color: #9B8E7E; margin: 0 0 12px; line-height: 1.5;">Geführte Kriyas — das erste Video jeder Playlist ist kostenlos.</p>
              <a href="${siteUrl}/videos" style="font-family: sans-serif; font-size: 13px; font-weight: 500; color: #D3BC76; text-decoration: none;">Zur Video-Bibliothek →</a>
            </td>
          </tr>
        </table>
        <div style="background: #2C2416; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; text-align: center;">
          <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #D3BC76; margin: 0 0 8px; font-family: sans-serif;">Mitgliedschaft</p>
          <p style="font-size: 20px; font-weight: 300; color: #FAF7F2; margin: 0 0 10px;">Unbegrenzter Zugang zu allen Kriyas</p>
          <p style="font-size: 14px; color: #9B8E7E; margin: 0 0 20px; line-height: 1.6;">Als Mitglied hast du vollen Zugriff auf alle Videos, Live-Sessions und neue Inhalte.</p>
          <a href="${shopUrl}" style="display: inline-block; background: #D3BC76; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 100px; font-family: sans-serif; font-size: 14px; font-weight: 500;">
            Jetzt Mitglied werden →
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #EDE8E0; margin: 28px 0;">
        <p style="font-size: 12px; color: #9B8E7E;">kundaliniyogatribe.de · Sat Nam Rasayan & Kundalini Kriyas</p>
        <p style="font-size: 11px; color: #B0A090; margin-top: 8px;">
          Du möchtest keine E-Mails mehr erhalten? <a href="${unsubUrl}" style="color: #B0A090; text-decoration: underline;">Hier abmelden</a>
        </p>
      </div>
    `
    const welcomeText = lang === 'en'
      ? `Sat Nam — welcome to the Kundalini Yoga Tribe!\n\nYour starting points:\n\n1. What is Kundalini Yoga? → ${siteUrl}/artikel/was-ist-kundalini-yoga\n2. Sat Kriya guide → ${siteUrl}/artikel/sat-kriya-anleitung\n3. Video library → ${siteUrl}/videos\n\nMembership for full access: ${shopUrl}\n\nUnsubscribe: ${unsubUrl}`
      : `Sat Nam — willkommen im Kundalini Yoga Tribe!\n\nDeine ersten Schritte:\n\n1. Was ist Kundalini Yoga? → ${siteUrl}/artikel/was-ist-kundalini-yoga\n2. Sat Kriya Anleitung → ${siteUrl}/artikel/sat-kriya-anleitung\n3. Video-Bibliothek → ${siteUrl}/videos\n\nMitgliedschaft für vollen Zugriff: ${shopUrl}\n\nAbmelden: ${unsubUrl}`

    fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Messages: [{
          From: { Email: fromEmail, Name: 'Kundalini Yoga Tribe' },
          To: [{ Email: email }],
          Subject: welcomeSubject,
          HTMLPart: welcomeHtml,
          TextPart: welcomeText,
        }],
      }),
    }).catch(err => console.error('Welcome email error:', err))

    return NextResponse.redirect(`${siteUrl}/anmeldung?status=bestaetigt`)
  } catch (e) {
    console.error('Confirm error:', e)
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
  }
}
