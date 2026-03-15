import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const siteUrl = 'https://kundaliniyogatribe.de'

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=abgemeldet`)
  }

  const email = await redis.get(`unsub:${token}`)

  if (!email) {
    // Token expired or invalid — still show success (no info leak)
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=abgemeldet`)
  }

  const apiKey = process.env.MAILJET_API_KEY?.trim()
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim()
  const listId = process.env.MAILJET_LIST_ID?.trim()

  try {
    // Remove from Mailjet contact list if credentials available
    if (apiKey && secretKey && listId) {
      const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')
      await fetch(`https://api.mailjet.com/v3/REST/contactslist/${listId}/managecontact`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Email: email, Action: 'remove' }),
      })
    }

    // Clean up Redis keys
    await redis.del(`confirmed:${email}`)
    await redis.del(`unsub:${token}`)

    return NextResponse.redirect(`${siteUrl}/anmeldung?status=abgemeldet`)
  } catch (e) {
    console.error('Unsubscribe error:', e)
    return NextResponse.redirect(`${siteUrl}/anmeldung?status=abgemeldet`)
  }
}
