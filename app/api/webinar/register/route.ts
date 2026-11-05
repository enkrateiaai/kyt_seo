import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import redis from '@/lib/redis'
import { SITE_URL, buildPersonalSlotLink, fetchWebinars } from '@/lib/webinar'
import { findSlotById, isBookableSlot, webinarPhase } from '@/lib/webinarSchedule'
import { isResendConfigured, sendResendEmail } from '@/lib/resend'
import { buildRegistrationMail } from '@/lib/webinarMail'
import { getRegistration, mintToken, tokenKey } from '@/lib/webinarAttendance'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_WINDOW_SEC = 3600
const MAX_PER_EMAIL = 3
const MAX_PER_IP = 10

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

// Simple fixed-window counter. Returns false when the limit is reached.
async function rateLimit(key: string, max: number): Promise<boolean> {
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, RATE_WINDOW_SEC)
    return count <= max
  } catch {
    // If Redis is unavailable we do not block the registration.
    return true
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; slotId?: unknown; name?: unknown }
  try {
    body = (await request.json()) as { email?: unknown; slotId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : ''
  const rawName = typeof body.name === 'string' ? body.name.trim() : ''
  // Keep the name short and printable - it is only shown in the reminder.
  const name = rawName.replace(/\s+/g, ' ').slice(0, 80)

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, { status: 400 })
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'Bitte gib deinen Namen ein.' }, { status: 400 })
  }
  if (!slotId) {
    return NextResponse.json({ error: 'Bitte wähle einen Termin aus.' }, { status: 400 })
  }
  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Der Versand ist gerade nicht möglich.' }, { status: 503 })
  }

  // The slot must exist and must still be in the future.
  const webinars = await fetchWebinars()
  const slot = findSlotById(webinars, slotId)
  if (!slot) {
    return NextResponse.json({ error: 'Dieser Termin existiert nicht (mehr).' }, { status: 404 })
  }
  if (webinarPhase(slot, Date.now()) !== 'before') {
    return NextResponse.json(
      { error: 'Dieser Termin ist nicht mehr buchbar. Bitte wähle einen anderen.' },
      { status: 409 },
    )
  }
  // Short-notice registrations are not accepted: a slot has to be at least
  // two hours away, so people get a real chance to make it to the session.
  if (!isBookableSlot(slot, Date.now())) {
    return NextResponse.json(
      { error: 'Dieser Termin startet in weniger als 2 Stunden und kann nicht mehr gebucht werden.' },
      { status: 409 },
    )
  }

  const ip = clientIp(request)
  const [emailAllowed, ipAllowed] = await Promise.all([
    rateLimit(`webinar:rl:email:${email}`, MAX_PER_EMAIL),
    rateLimit(`webinar:rl:ip:${ip}`, MAX_PER_IP),
  ])
  if (!emailAllowed || !ipAllowed) {
    return NextResponse.json(
      { error: 'Zu viele Anmeldungen. Bitte warte ein wenig und versuche es erneut.' },
      { status: 429 },
    )
  }

  // Every booking gets a personal token. It rides along in the link, so we can
  // see later who watched the webinar and since when.
  const existing = await getRegistration(slot.id, email)
  const token = existing?.token?.trim() || mintToken()
  const link = buildPersonalSlotLink(slot, token)
  const unsubToken = randomBytes(32).toString('hex')
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${unsubToken}`

  // Remember the registration so the studio can show how many people booked.
  const metaKey = `webinar:reg:${slot.id}:${email}`
  const meta = JSON.stringify({
    email,
    name,
    slotId: slot.id,
    title: slot.title,
    startsAt: slot.startsAt,
    registeredAt: existing?.registeredAt || new Date().toISOString(),
    token,
  })
  try {
    await redis.sadd(`webinar:reg:slots:${slot.id}`, email)
    await redis.setex(metaKey, 60 * 60 * 24 * 90, meta)
    await redis.setex(
      tokenKey(token),
      60 * 60 * 24 * 90,
      JSON.stringify({ email, name, slotId: slot.id, startsAt: slot.startsAt ?? null }),
    )
    await redis.setex(`unsub:${unsubToken}`, 60 * 60 * 24 * 365, email)
  } catch {
    // Redis is optional for the mail flow - a missing counter must not
    // prevent the confirmation mail.
  }

  const mail = buildRegistrationMail({ slot, link, unsubscribeUrl })
  const result = await sendResendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })

  if (!result.ok) {
    // Roll back the registration so a retry is not blocked by the duplicate.
    try {
      await redis.del(metaKey)
      await redis.srem(`webinar:reg:slots:${slot.id}`, email)
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: 'Die Bestätigungs-Mail konnte nicht verschickt werden. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      email,
      link,
      slot: { id: slot.id, title: slot.title, startsAt: slot.startsAt },
    },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
