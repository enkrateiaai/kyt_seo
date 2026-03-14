import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
  }

  const apiKey = process.env.MAILJET_API_KEY
  const secretKey = process.env.MAILJET_SECRET_KEY
  const listId = process.env.MAILJET_LIST_ID

  if (!apiKey || !secretKey || !listId) {
    console.error('Missing env vars:', { apiKey: !!apiKey, secretKey: !!secretKey, listId: !!listId })
    return NextResponse.json({ error: 'Konfigurationsfehler' }, { status: 500 })
  }

  try {
    const credentials = btoa(`${apiKey}:${secretKey}`)
    const res = await fetch(`https://api.mailjet.com/v3/REST/contactslist/${listId}/managecontact`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Email: email,
        Action: 'addnoforce',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Mailjet error:', res.status, err)
      return NextResponse.json({ error: 'Fehler beim Eintragen' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Subscribe catch:', e)
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 })
  }
}
