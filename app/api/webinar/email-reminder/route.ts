import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { STUDIO_TOKEN, buildPersonalSlotLink, buildSlotLink, fetchWebinars } from '@/lib/webinar'
import { WebinarConfig } from '@/lib/webinarSchedule'
import { isResendConfigured, sendResendEmail } from '@/lib/resend'
import { buildReminderMail } from '@/lib/webinarReminderMail'
import { findBuyer, listBuyers } from '@/lib/webinarAccess'

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

function endMs(slot: WebinarConfig): number | null {
  if (!slot.endsAt) return null
  const value = Date.parse(slot.endsAt)
  return Number.isFinite(value) ? value : null
}

// The paid webinar is on demand: the slot has a window (startsAt ... endsAt)
// and not a single live moment. A slot that has already started but whose
// window is still open therefore counts as "due" - buyers get their access
// link while the window is open.
type SlotState = {
  mode: 'live' | 'ondemand' | 'past'
  minutes: number
}

function slotState(slot: WebinarConfig, now: number): SlotState {
  const start = startMs(slot)
  const end = endMs(slot)
  if (start !== null && start > now) {
    return { mode: 'live', minutes: Math.max(1, Math.round((start - now) / 60_000)) }
  }
  if (end !== null && end > now) {
    return { mode: 'ondemand', minutes: 0 }
  }
  return { mode: 'past', minutes: 0 }
}

// The reminder state per slot: the list of addresses that already got the mail.
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
  const relevant = webinars
    .map((slot) => ({ slot, state: slotState(slot, now) }))
    .filter((entry) => entry.state.mode !== 'past')
    .sort((a, b) => (startMs(a.slot) ?? 0) - (startMs(b.slot) ?? 0))

  // Test send: one mail to one address, without touching the slot state.
  if (testSend) {
    const entry = relevant.find((e) => e.slot.id === requestedSlotId) || (requestedSlotId ? null : relevant[0])
    if (!entry) {
      return NextResponse.json({ error: 'Kein Termin gefunden' }, { status: 404 })
    }
    const { slot, state } = entry
    // A buyer gets their own link (with token), everybody else a preview of
    // the generic page.
    const buyer = await findBuyer(testSend)
    const link = buyer ? buildPersonalSlotLink(slot, buyer.token) : buildSlotLink(slot)
    const mail = buildReminderMail({
      slot,
      link,
      minutes: state.minutes,
      name: buyer?.name || 'Viktor',
      onDemand: state.mode === 'ondemand',
    })
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        to: testSend,
        subject: mail.subject,
        text: mail.text,
        link,
        personalLink: Boolean(buyer),
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
  const due = relevant.filter((entry) => {
    if (entry.state.mode === 'ondemand') return true
    const start = startMs(entry.slot)
    return start !== null && start - now <= leadMs
  })

  const results: Array<Record<string, unknown>> = []
  for (const { slot, state } of due) {
    const minutes = state.minutes

    // The recipients are the buyers. The free registration is closed, and a
    // link without a token would only lead to the paywall.
    const buyers = await listBuyers()

    const already = await notifiedEmails(slot.id)
    for (const buyer of buyers) {
      const email = buyer.email
      if (!email) continue
      if (EXCLUDED_EMAILS.has(email)) {
        results.push({ slotId: slot.id, email, skipped: 'operator' })
        continue
      }
      if (already.has(email)) {
        results.push({ slotId: slot.id, email, skipped: 'already sent' })
        continue
      }
      // Every buyer gets the personal link of their own purchase.
      const link = buildPersonalSlotLink(slot, buyer.token)
      const mail = buildReminderMail({
        slot,
        link,
        minutes,
        name: buyer.name,
        onDemand: state.mode === 'ondemand',
      })
      if (dryRun) {
        results.push({ slotId: slot.id, email, name: buyer.name, dryRun: true, subject: mail.subject, link })
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
