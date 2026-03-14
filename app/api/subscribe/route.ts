import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
  }

  const apiKey = process.env.MAILJET_API_KEY
  const secretKey = process.env.MAILJET_SECRET_KEY
  const listId = process.env.MAILJET_LIST_ID

  try {
    const res = await fetch(`https://api.mailjet.com/v3/REST/contactslist/${listId}/managecontact`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Email: email,
        Action: 'addnoforce',
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Mailjet error:', err)
      return NextResponse.json({ error: 'Fehler beim Eintragen' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 })
  }
}
