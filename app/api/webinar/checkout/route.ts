import { NextRequest, NextResponse } from 'next/server'
import { createWebinarPaymentIntent } from '@/lib/stripe'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { name?: unknown; email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (name.length < 2) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Ungültige E-Mail' }, { status: 400 })

  try {
    const intent = await createWebinarPaymentIntent(name, email)
    return NextResponse.json({ clientSecret: intent.client_secret })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
