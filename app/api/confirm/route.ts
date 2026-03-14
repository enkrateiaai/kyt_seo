import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const siteUrl = 'https://kundaliniyogatribe.de'

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
  }

  const email = await redis.get(`doi:${token}`)

  if (!email) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=abgelaufen`)
  }

  const apiKey = process.env.MAILJET_API_KEY?.trim()
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim()
  const listId = process.env.MAILJET_LIST_ID?.trim()

  if (!apiKey || !secretKey || !listId) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')
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

    // Mark as confirmed, delete token
    await redis.setex(`confirmed:${email}`, 2592000, '1') // 30 days
    await redis.del(`doi:${token}`)

    return NextResponse.redirect(`${siteUrl}/anmeldung?status=bestaetigt`)
  } catch (e) {
    console.error('Confirm error:', e)
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=fehler`)
  }
}
