import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { STUDIO_TOKEN, buildPersonalSlotLink, buildSlotLink, fetchWebinars } from '@/lib/webinar'
import { WebinarConfig } from '@/lib/webinarSchedule'
import { isResendConfigured, sendResendEmail } from '@/lib/resend'
import { buildReminderMail } from '@/lib/webinarReminderMail'
import { ensureToken, getRegistration } from '@/lib/webinarAttendance'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// How long before the start the reminder goes out.
const DEFAULT_LEAD_MINUTES = 15
const MIN_LEAD_MINUTES = 1
const MAX_LEAD_MINUTES = 120

// Reminder state per slot: the list of addresses that already got the mail.
const STATE_KEY_PREFIX = 'webinar:mailreminder:'
const STATE_TTL_SECONDS = 60 * 60 * 48

// Test bookings of the operators - no reminder mail for them.
const EXCLUDED_EMAILS = new Set([
  'viktor.nik.ulin@gmail.com',
  'catscheitterlein@gmail.com',
])

function isAuthorized(request: NextRequest): boolean {
  const expected = STUDIO_TOKEN.trim()
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${expected}`
}

function startMs(slot: WebinarConfig): number | null {
  if (!slot.startsAt) return null
  const value = Date.parse(slot.startsAt)
  return Number.isFinite(value) ? value : null
}

// The registration stores the name next to the booking. Older bookings from
// before the name field was added simply have no name - the greeting is
// optional then.
async function registeredName(slotId: string, email: string): Promise<string> {
  try {
    const raw = await redis.get(`webinar:reg:${slotId}:${email}`)
    if (!raw) return ''
    const meta = JSON.parse(raw) as { name?: unknown }
    return typeof meta.name === 'string' ? meta.name : ''
  } catch {
    return ''
  }
}

async function notifiedEmails(slotId: string): Promise<Set<string>> {
  try {
    const raw = await redis.get(STATE_KEY_PREFIX + slotId)
    const list = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(Array.isArray(list) ? list : [])
  } catch {
    return new Set()
  }
}

async function rememberNotified(slotId: string, emails: Set<string>): Promise<void> {
  if (emails.size === 0) return
  try {
    await redis.set(STATE_KEY_PREFIX + slotId, JSON.stringify([...emails]), 'EX', STATE_TTL_SECONDS)
  } catch {
    // Without Redis a second run could send a duplicate mail.
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'RESEND_API_KEY fehlt' }, { status: 503 })
  }

  const params = request.nextUrl.searchParams
  const dryRun = params.get('dryRun') === '1'
  const testSend = (params.get('testSend') || '').trim().toLowerCase()
  const requestedSlotId = (params.get('slotId') || '').trim()
  const leadParam = Number(params.get('leadMinutes'))
  const leadMinutes = Number.isFinite(leadParam) && leadParam > 0
    ? Math.min(MAX_LEAD_MINUTES, Math.max(MIN_LEAD_MINUTES, Math.round(leadParam)))
    : DEFAULT_LEAD_MINUTES

  const now = Date.now()
  const webinars = await fetchWebinars()
  const upcoming = webinars
    .filter((slot) => {
      const start = startMs(slot)
      return start !== null && start > now
    })
    .sort((a, b) => (startMs(a) ?? 0) - (startMs(b) ?? 0))

  // Test send: one mail to one address, without touching the slot state.
  if (testSend) {
    const slot = upcoming.find((s) => s.id === requestedSlotId) || (requestedSlotId ? null : upcoming[0])
    if (!slot) {
      return NextResponse.json({ error: 'Kein Termin gefunden' }, { status: 404 })
    }
    const start = startMs(slot) ?? now + leadMinutes * 60_000
    const minutes = Math.max(1, Math.round((start - now) / 60_000))
    const link = buildSlotLink(slot)
    const mail = buildReminderMail({ slot, link, minutes, name: 'Viktor' })
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        to: testSend,
        subject: mail.subject,
        text: mail.text,
        link,
      })
    }
    const result = await sendResendEmail({
      to: testSend,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    })
    return NextResponse.json({ ok: result.ok, to: testSend, slotId: slot.id, result })
  }

  const leadMs = leadMinutes * 60_000
  const due = upcoming.filter((slot) => {
    const start = startMs(slot)
    return start !== null && start - now <= leadMs
  })

  const results: Array<Record<string, unknown>> = []
  for (const slot of due) {
    const start = startMs(slot) ?? now
    const minutes = Math.max(1, Math.round((start - now) / 60_000))
    const link = buildSlotLink(slot)

    let members: string[] = []
    try {
      members = await redis.smembers(`webinar:reg:slots:${slot.id}`)
    } catch {
      results.push({ slotId: slot.id, error: 'Redis nicht erreichbar' })
      continue
    }

    const already = await notifiedEmails(slot.id)
    for (const rawEmail of members) {
      const email = rawEmail.trim().toLowerCase()
      if (!email) continue
      if (EXCLUDED_EMAILS.has(email)) {
        results.push({ slotId: slot.id, email, skipped: 'operator' })
        continue
      }
      if (already.has(email)) {
        results.push({ slotId: slot.id, email, skipped: 'already sent' })
        continue
      }
      const registration = await getRegistration(slot.id, email)
      const name = registration?.name || (await registeredName(slot.id, email))
      // Everyone gets the personal link of their own booking, so the studio
      // can see who watched and since when.
      const token = registration ? await ensureToken(slot.id, email, registration) : ''
      const memberLink = token ? buildPersonalSlotLink(slot, token) : link
      const mail = buildReminderMail({ slot, link: memberLink, minutes, name })
      if (dryRun) {
        results.push({ slotId: slot.id, email, name, dryRun: true, subject: mail.subject })
        continue
      }
      const sent = await sendResendEmail({
        to: email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      })
      if (sent.ok) {
        already.add(email)
        results.push({ slotId: slot.id, email, ok: true, id: sent.id })
      } else {
        results.push({ slotId: slot.id, email, ok: false, error: sent.error })
      }
    }
    await rememberNotified(slot.id, already)
  }

  return NextResponse.json(
    {
      ok: true,
      now: new Date(now).toISOString(),
      leadMinutes,
      slotsTotal: webinars.length,
      slotsDue: due.length,
      results,
    },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
